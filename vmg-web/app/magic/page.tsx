'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MagicPage() {
  const router = useRouter();
  const [frase, setFrase] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  const [showNoBankModal, setShowNoBankModal] = useState(false);
  const [showNoCardModal, setShowNoCardModal] = useState(false);
  const [totalCartoesSistema, setTotalCartoesSistema] = useState<number>(0);

  const [showLimitAlert, setShowLimitAlert] = useState(false);
  const [alertDetails, setAlertDetails] = useState<any>(null);
  const [cachedPayload, setCachedPayload] = useState<any>(null);
  const [upgradeLimitValue, setUpgradeLimitValue] = useState('');
  const [loadingLimitUpdate, setLoadingLimitUpdate] = useState(false);
  
  const [cartoesDisponiveis, setCartoesDisponiveis] = useState<any[]>([]);
  const [idCartaoSelecionado, setIdCartaoSelecionado] = useState<string>('');

  const [bancos, setBancos] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const carregarDadosIniciais = async () => {
    try {
      const resAccounts = await fetch(`http://localhost:8080/api/accounts?t=${Date.now()}`);
      if (resAccounts.ok) {
        const data = await resAccounts.json();
        setBancos(data);
        
        if (!data || data.length === 0) {
          setShowNoBankModal(true);
          return;
        }

        const total = data.reduce((acc: number, banco: any) => acc + (banco.cards?.length || 0), 0);
        setTotalCartoesSistema(total);
      } else {
        setShowNoBankModal(true);
      }
      
      const resTx = await fetch('http://localhost:8080/api/transactions');
      if (resTx.ok) setTransactions(await resTx.json());
    } catch (error) {
      setShowNoBankModal(true);
    }
  };

  useEffect(() => { carregarDadosIniciais(); }, []);

  useEffect(() => {
    if (!showLimitAlert || !idCartaoSelecionado || !cachedPayload) return;

    const cartaoObjeto = cartoesDisponiveis.find(c => String(c.id) === String(idCartaoSelecionado));
    if (!cartaoObjeto) return;

    const hoje = new Date();
    const faturaDoCartao = transactions
      .filter((t: any) => {
        const mesmoCard = t.card?.id === cartaoObjeto.id;
        const dataTx = new Date(t.transactionDate);
        const ehDesteMes = dataTx.getMonth() === hoje.getMonth() && dataTx.getFullYear() === hoje.getFullYear();
        return t.type === 'DESPESA' && mesmoCard && ehDesteMes;
      })
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const limiteDisponivel = Number(cartaoObjeto.creditLimit || 0) - faturaDoCartao;
    
    const totalParcelas = Number(cachedPayload.installmentsCount || 1);
    const valorParcelaTentado = Number(cachedPayload.amount) / totalParcelas;
    
    const diferenca = valorParcelaTentado - (limiteDisponivel < 0 ? 0 : limiteDisponivel);
    const novaSugestao = Number(cartaoObjeto.creditLimit || 0) + (diferenca > 0 ? diferenca : 0);

    setAlertDetails((prev: any) => ({
      ...prev,
      nomeCartao: cartaoObjeto.name,
      limiteDisponivel: limiteDisponivel < 0 ? 0 : limiteDisponivel,
      valorTentado: valorParcelaTentado,
      sugestao: Math.ceil(novaSugestao)
    }));
    setUpgradeLimitValue(String(Math.ceil(novaSugestao)));
  }, [idCartaoSelecionado]);

  const processarFraseComIA = async () => {
    if (!frase.trim()) return;

    const regexMapeiaParcelas = /\b(\d+)\s*(?:X|PARCELAS|VEZES)\b/i;
    const ehTentativaParcelamento = regexMapeiaParcelas.test(frase);

    if (ehTentativaParcelamento && totalCartoesSistema === 0) {
      setShowNoCardModal(true);
      return;
    }

    setLoadingIA(true);
    setErrorMessage(null);
    try {
      const resIA = await fetch('http://localhost:8080/api/ia/interpretar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frase: frase.trim() })
      });

      if (resIA.ok) {
        const data = await resIA.json();

        if (data.type === 'TRANSFERENCIA' || (data.sourceBank && data.targetBank)) {
          await executarTransferenciaInvisivel({
            sourceBank: data.sourceBank || '',
            targetBank: data.targetBank || '',
            amount: data.amount ? Number(data.amount) : 0
          });
          return;
        }

        let valorDetectado = data.amount ? Number(data.amount) : 0;
        if (valorDetectado === 0) {
          const match = frase.match(/(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\\d{2})?)/);
          if (match) {
            valorDetectado = Number(match[1].replace('.', '').replace(',', '.'));
          }
        }

        let contaMapeada = null;
        if (data.account && data.account.id) {
          contaMapeada = bancos.find((b: any) => b.id === Number(data.account.id));
        } else {
          contaMapeada = bancos.find((b: any) => frase.toUpperCase().includes(b.name.toUpperCase().trim()));
        }
        
        if (!contaMapeada && bancos.length > 0) {
          contaMapeada = bancos[0];
        }

        const payloadTransacao = {
          description: data.description || frase.toUpperCase(),
          amount: valorDetectado,
          transactionDate: data.transactionDate || new Date().toISOString().split('T')[0],
          type: data.type || 'DESPESA',
          category: 'EM_ABERTO',
          installment: data.installment !== undefined ? data.installment : (data.isInstallment || false),
          installmentsCount: Number(data.installmentsCount || 1),
          recurring: data.recurring !== undefined ? data.recurring : (data.isRecurring || false),
          account: contaMapeada ? { id: Number(contaMapeada.id) } : null,
          card: data.card || null
        };

        const matchX = frase.match(regexMapeiaParcelas);
        if (matchX) {
          payloadTransacao.installment = true;
          payloadTransacao.installmentsCount = Number(matchX[1]);
        }

        await verificarLimiteEGravar(payloadTransacao, false);
      } else {
        setErrorMessage("A IA não conseguiu interpretar esta frase. Tente mudar os termos.");
      }
    } catch (error) {
      setErrorMessage("Erro de comunicação com o servidor.");
    } finally {
      setLoadingIA(false);
    }
  };

  const executarTransferenciaInvisivel = async (transferPayload: { sourceBank: string; targetBank: string; amount: number }) => {
    try {
      const res = await fetch('http://localhost:8080/api/accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferPayload)
      });
      if (res.ok) router.push('/');
    } catch (error) {
      setErrorMessage("Erro de conexão ao tentar transferir valores.");
    }
  };

  const verificarLimiteEGravar = async (payload: any, forceSave = false) => {
    if (payload.type === 'DESPESA' && payload.installment && !forceSave) {
      let contaAlvo = bancos.find((b: any) => b.id === Number(payload.account?.id));
      
      if (!contaAlvo && bancos.length > 0) {
        contaAlvo = bancos[0];
        payload.account = { id: contaAlvo.id };
      }

      if (contaAlvo && contaAlvo.cards && contaAlvo.cards.length > 0) {
        setCartoesDisponiveis(contaAlvo.cards);
        setIdCartaoSelecionado(String(contaAlvo.cards[0].id));
        setCachedPayload(payload);
        
        const totalParcelas = Number(payload.installmentsCount || 1);
        const valorParcelaInicial = payload.amount / totalParcelas;

        setAlertDetails({
          nomeCartao: contaAlvo.cards[0].name,
          limiteDisponivel: 0,
          valorTentado: valorParcelaInicial, 
          sugestao: valorParcelaInicial,
          contaDonaId: contaAlvo.id
        });
        setShowLimitAlert(true);
        return;
      }
    }

    await executarPostOficial(payload, forceSave);
  };

  const executarPostOficial = async (payload: any, force = false) => {
    try {
      if (showLimitAlert && idCartaoSelecionado) {
        payload.card = { id: Number(idCartaoSelecionado) };
      }

      const url = `http://localhost:8080/api/transactions${force ? '?force=true' : ''}`;
      const resSave = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resSave.status === 422) {
        const dadosDoEstouro = await resSave.json();
        const originalAccount = dadosDoEstouro.payloadOriginal?.account || {};
        const contaAlvo = bancos.find((b: any) => b.id === Number(originalAccount.id));
        
        if (contaAlvo && (contaAlvo as any).cards) {
          setCartoesDisponiveis((contaAlvo as any).cards);
        }

        setAlertDetails({
          cardObj: dadosDoEstouro.payloadOriginal?.card || { id: Number(idCartaoSelecionado) },
          contaDonaId: originalAccount.id || (contaAlvo ? (contaAlvo as any).id : (bancos.length > 0 ? (bancos[0] as any).id : 1)),
          nomeCartao: dadosDoEstouro.nomeCartao,
          limiteDisponivel: Number(dadosDoEstouro.limiteDisponivel),
          valorTentado: Number(dadosDoEstouro.valorTentado), 
          sugestao: Number(dadosDoEstouro.sugestao)
        });
        
        if (!idCartaoSelecionado && dadosDoEstouro.payloadOriginal?.card?.id) {
          setIdCartaoSelecionado(String(dadosDoEstouro.payloadOriginal.card.id));
        }

        setUpgradeLimitValue(String(dadosDoEstouro.sugestao));
        setCachedPayload(dadosDoEstouro.payloadOriginal);
        setShowLimitAlert(true);
        return;
      }

      if (resSave.ok) { 
        setShowLimitAlert(false); 
        router.push('/'); 
      } else {
        const errorData = await resSave.json();
        setErrorMessage(errorData.error || "Erro ao salvar lançamento.");
      }
    } catch (error) {
      setErrorMessage("Erro ao conectar com o servidor para salvar.");
    }
  };

  const handleUpgradeLimitAndSave = async () => {
    if (!upgradeLimitValue || isNaN(Number(upgradeLimitValue)) || !alertDetails || !cachedPayload) return;
    setLoadingLimitUpdate(true);
    try {
      const cardId = idCartaoSelecionado ? Number(idCartaoSelecionado) : Number(alertDetails.cardObj.id || 1);
      const resLimit = await fetch(`http://localhost:8080/api/accounts/${alertDetails.contaDonaId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: cardId, 
          name: alertDetails.nomeCartao, 
          creditLimit: Number(upgradeLimitValue)
        })
      });
      if (resLimit.ok) {
        const novoPayload = { ...cachedPayload, card: { id: cardId } };
        await executarPostOficial(novoPayload, true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLimitUpdate(false);
    }
  };

  return (
    // 🎯 REAJUSTE DE MARGEM EXTERNA LATERAL FEITO EM PL-80
    <main className="min-h-screen bg-gray-50 p-8 text-black flex flex-col justify-between sm:justify-start sm:gap-12 pl-80">
      <div className="max-w-xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all">← Cancelar</Link>
          <h1 className="text-xl font-black tracking-tighter uppercase">VMG MAGIC ✨</h1>
        </div>

        <div className="bg-white p-4 rounded-[2rem] border shadow-sm flex items-center gap-3 animate-in fade-in">
          <input className="flex-1 bg-transparent p-2 font-bold text-sm outline-none text-black placeholder-gray-300 border-none" placeholder="O que você gastou ou recebeu hoje?" value={frase} onChange={e => setFrase(e.target.value)} onKeyDown={e => e.key === 'Enter' && processarFraseComIA()} />
          <button onClick={processarFraseComIA} disabled={loadingIA} className="bg-blue-600 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-md transition-all">IA</button>
        </div>
        {errorMessage && <p className="text-xs font-bold text-red-500 text-center uppercase tracking-tight">{errorMessage}</p>}
      </div>

      {showNoCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-md p-8 text-center space-y-5 border shadow-2xl">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">💳</div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">Mapeamento de Crédito Exigido</h3>
              <p className="text-xs text-gray-400 font-extrabold uppercase max-w-xs mx-auto leading-relaxed">
                Você tentou realizar um lançamento parcelado, mas não possui nenhum cartão de crédito cadastrado no sistema ainda.
              </p>
            </div>
            <button onClick={() => router.push('/bancos')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider py-4 rounded-xl shadow-md transition-all">
              Cadastrar Cartão de Crédito Agora ➡️
            </button>
          </div>
        </div>
      )}

      {showLimitAlert && alertDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-md p-8 text-center space-y-5 shadow-2xl border border-gray-100">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">⚠️</div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-none">Escolha do Cartão & Limite</h3>
              <p className="text-xs text-gray-400 font-extrabold uppercase tracking-wide">Selecione qual cartão vai receber essa transação parcelada</p>
            </div>

            {cartoesDisponiveis.length > 0 && (
              <div className="text-left space-y-1">
                <select className="w-full p-3 bg-gray-50 border font-black text-xs rounded-xl uppercase text-black outline-none appearance-none cursor-pointer focus:border-purple-500 shadow-sm" value={idCartaoSelecionado} onChange={e => setIdCartaoSelecionado(e.target.value)}>
                  {cartoesDisponiveis.map((card: any) => (
                    <option key={card.id} value={card.id}>💳 {card.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="bg-gray-50/70 rounded-2xl p-5 text-xs font-bold text-gray-500 text-left space-y-3">
              <div className="flex justify-between items-center"><span>📉 Disponível no Selecionado:</span> <span className="text-green-600 font-black text-sm">R$ {alertDetails.limiteDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between items-center"><span>💸 Valor da Parcela:</span> <span className="text-red-500 font-black text-sm">R$ {alertDetails.valorTentado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            </div>

            {alertDetails.valorTentado > alertDetails.limiteDisponivel && (
              <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 text-left space-y-2.5">
                <div className="flex gap-2">
                  <input type="number" className="flex-1 p-2.5 bg-white text-xs font-black border rounded-xl text-center text-black" value={upgradeLimitValue} onChange={e => setUpgradeLimitValue(e.target.value)} />
                  <button onClick={handleUpgradeLimitAndSave} disabled={loadingLimitUpdate} className="bg-purple-600 text-white text-[10px] font-black px-5 rounded-xl uppercase shadow-sm">{loadingLimitUpdate ? '...' : 'Alterar'}</button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowLimitAlert(false)} className="w-1/2 bg-gray-100 text-gray-700 font-black text-xs py-4 rounded-2xl">Rever Frase</button>
              <button onClick={() => executarPostOficial(cachedPayload, true)} className="w-1/2 bg-red-600 text-white font-black text-xs py-4 rounded-2xl shadow-lg">
                {alertDetails.valorTentado > alertDetails.limiteDisponivel ? 'Ignorar e Lançar' : 'Confirmar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}