'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function BancosPage() {
  const router = useRouter();
  const [bancos, setBancos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CONTROLADORES DOS POP-UPS DE CADASTRO MODAL
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [incluirCartaoNoBanco, setIncluirCartaoNoBanco] = useState(false);

  // STATES DOS INPUTS DOS FORMULÁRIOS
  const [nomeBanco, setNomeBanco] = useState('');
  const [saldoBanco, setSaldoBanco] = useState('');
  const [selectedBancoId, setSelectedBancoId] = useState('');
  const [nomeCartao, setNomeCartao] = useState('');
  const [limiteCartao, setLimiteCartao] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  // STATES DA TRANSFERÊNCIA INTERNA
  const [sourceBankName, setSourceBankName] = useState('');
  const [targetBankName, setTargetBankName] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // STATES OPERACIONAIS DOS FILTROS E EXCLUSÕES
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'BANCO' | 'CARTAO'; accountId: number; cardId?: number } | null>(null);
  const [ajustarLimiteTarget, setAjustarLimiteTarget] = useState<{ accountId: number; card: any } | null>(null);
  const [novoLimiteValue, setNovoLimiteValue] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; success: boolean } | null>(null);

  // EXTRACT STATES
  const [selectedBankForExtract, setSelectedBankForExtract] = useState<any | null>(null);
  const [extractTransactions, setExtractTransactions] = useState<any[]>([]);
  const [loadingExtract, setLoadingExtract] = useState(false);

  const [selectedCardForExtract, setSelectedCardForExtract] = useState<any | null>(null);
  const [cardTransactions, setCardTransactions] = useState<any[]>([]);
  const [loadingCardExtract, setLoadingCardExtract] = useState(false);

  const fetchBancos = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/accounts?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setBancos([]); 
        setTimeout(() => {
          setBancos(data);
          if (data.length > 0) {
            setSelectedBancoId(data[0].id.toString());
            setSourceBankName(data[0].name);
            setTargetBankName(data.length > 1 ? data[1].name : data[0].name);
          }
        }, 50);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBancos(); }, []);

  const showToast = (text: string, success = true) => {
    setToastMessage({ text, success });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const abrirExtratoBanco = async (banco: any) => {
    setSelectedBankForExtract(banco);
    setLoadingExtract(true);
    try {
      const res = await fetch('http://localhost:8080/api/transactions');
      if (res.ok) {
        const allTransactions = await res.json();
        const hoje = new Date();
        setExtractTransactions(allTransactions.filter((t: any) => t.account?.id === banco.id && t.card == null && new Date(t.transactionDate).getMonth() === hoje.getMonth()));
      }
    } catch (error) {
      showToast("Erro ao carregar extrato", false);
    } finally {
      setLoadingExtract(false);
    }
  };

  const abrirExtratoCartao = async (bancoId: number, cartao: any) => {
    setSelectedCardForExtract({ ...cartao, accountId: bancoId });
    setLoadingCardExtract(true);
    try {
      const res = await fetch('http://localhost:8080/api/transactions');
      if (res.ok) {
        const allTransactions = await res.json();
        setCardTransactions(allTransactions.filter((t: any) => t.card?.id === cartao.id && new Date(t.transactionDate).getMonth() === new Date().getMonth()));
      }
    } catch (error) {
      showToast("Erro ao carregar faturas", false);
    } finally {
      setLoadingCardExtract(false);
    }
  };

  const handleMudarStatusGasto = async (gastoId: number, novoStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/transactions/${gastoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: novoStatus })
      });
      if (res.ok) {
        showToast("Status atualizado!");
        await fetchBancos();
        if (selectedCardForExtract) abrirExtratoCartao(selectedCardForExtract.accountId, selectedCardForExtract);
      }
    } catch (error) {
      showToast("Erro ao mudar status", false);
    }
  };

  const handlePagarFaturaCompleta = async () => {
    if (!selectedCardForExtract) return;
    try {
      const res = await fetch(`http://localhost:8080/api/accounts/${selectedCardForExtract.accountId}/cards/${selectedCardForExtract.id}/pay-invoice`, {
        method: 'POST'
      });

      if (res.ok) {
        setSelectedCardForExtract(null);
        await fetchBancos();
        showToast("Fatura paga com sucesso!");
      } else {
        const errData = await res.json();
        if (errData.error === 'FATURA_NAO_FECHADA') {
          alert(`🚨 Alerta Contábil VMG: A fatura deste cartão possui fechamento programado apenas para o dia ${errData.closingDay}. Aguarde a virada do ciclo para efetuar o pagamento!`);
          return;
        }
        showToast(errData.error || "Erro ao liquidar fatura.", false);
      }
    } catch (error) {
      showToast("Erro ao processar pagamento", false);
    }
  };

  const handleCadastrarBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeBanco || !saldoBanco) return;
    try {
      const res = await fetch('http://localhost:8080/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nomeBanco.toUpperCase(), balance: Number(saldoBanco), cards: [] })
      });
      if (res.ok) {
        const novoBancoCriado = await res.json();
        setNomeBanco('');
        setSaldoBanco('');
        await fetchBancos();
        setShowAccountModal(false);
        showToast("Banco adicionado com sucesso!");

        if (incluirCartaoNoBanco) {
          setSelectedBancoId(String(novoBancoCriado.id));
          setIncluirCartaoNoBanco(false);
          setShowCardModal(true);
        }
      }
    } catch (error) {
      showToast("Erro ao cadastrar banco", false);
    }
  };

  const handleCadastrarCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBancoId || !nomeCartao || !limiteCartao || !closingDay || !dueDay) return;
    try {
      const res = await fetch(`http://localhost:8080/api/accounts/${selectedBancoId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: nomeCartao.toUpperCase(), 
          creditLimit: Number(limiteCartao),
          closingDay: Number(closingDay),
          dueDay: Number(dueDay)
        })
      });
      if (res.ok) {
        setNomeCartao('');
        setLimiteCartao('');
        setClosingDay('');
        setDueDay('');
        await fetchBancos();
        setShowCardModal(false);
        showToast("Cartão de crédito vinculado!");
      }
    } catch (error) {
      showToast("Erro ao conectar com o servidor", false);
    }
  };

  const handleExecutarTransferenciaManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBankName || !targetBankName || !transferAmount || sourceBankName === targetBankName) {
      alert("Selecione bancos de origem e destino diferentes!");
      return;
    }
    try {
      const res = await fetch('http://localhost:8080/api/accounts/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBank: sourceBankName,
          targetBank: targetBankName,
          amount: Number(transferAmount)
        })
      });

      if (res.ok) {
        setTransferAmount('');
        setShowTransferModal(false);
        await fetchBancos();
        showToast("Transferência concluída!");
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao processar transferência.");
      }
    } catch (error) {
      showToast("Erro ao comunicar com o servidor.", false);
    }
  };

  const ajustarLimiteSubmit = async () => {
    if (!ajustarLimiteTarget || !novoLimiteValue || isNaN(Number(novoLimiteValue))) return;
    try {
      const res = await fetch(`http://localhost:8080/api/accounts/${ajustarLimiteTarget.accountId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ajustarLimiteTarget.card, creditLimit: Number(novoLimiteValue) })
      });
      if (res.ok) { 
        setAjustarLimiteTarget(null); 
        setNovoLimiteValue(''); 
        await fetchBancos(); 
        showToast("Limite reajustado com sucesso!"); 
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executarExclusaoCustom = async () => {
    if (!deleteTarget) return;
    try {
      const url = deleteTarget.type === 'BANCO' 
        ? `http://localhost:8080/api/accounts/${deleteTarget.accountId}`
        : `http://localhost:8080/api/accounts/${deleteTarget.accountId}/cards/${deleteTarget.cardId}`;
        
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) { 
        setDeleteTarget(null); 
        await fetchBancos(); 
        showToast("Removido com sucesso!"); 
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-xl text-gray-900 animate-pulse">CARREGANDO CARTEIRAS...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-black space-y-8 relative pl-72">
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-4 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2">
          <span>{toastMessage.success ? '✅' : '❌'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all">← Voltar pro Dash</Link>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setShowTransferModal(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl shadow-sm hover:opacity-90 transition-all">💸 Transferir Valores</button>
            <button onClick={() => setShowAccountModal(true)} className="bg-black text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl shadow-sm hover:opacity-90 transition-all">+ Cadastrar Conta</button>
            <button onClick={() => setShowCardModal(true)} className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl shadow-sm hover:opacity-90 transition-all">💳 Cadastrar Cartão</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bancos.map((banco: any) => (
            <div key={banco.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div className="cursor-pointer flex-1" onClick={() => abrirExtratoBanco(banco)}>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1">Conta Bancária <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-md font-black">MÊS ATUAL 📋</span></span>
                    <h2 className="text-xl font-black text-gray-900 mt-0.5 uppercase tracking-tight">{banco.name}</h2>
                  </div>
                  <button onClick={() => setDeleteTarget({ type: 'BANCO', accountId: banco.id })} className="text-gray-300 hover:text-red-500 text-xs p-1 transition-all">🗑️ Apagar Conta</button>
                </div>
                
                <div className="cursor-pointer mt-2" onClick={() => abrirExtratoBanco(banco)}>
                  <p className="text-xl font-black text-green-600">{(banco.balance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                  <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cartões de Crédito Vinculados:</h4>
                  {!banco.cards || banco.cards.length === 0 ? (
                    <p className="text-[11px] font-bold text-gray-300 italic">Nenhum cartão neste banco.</p>
                  ) : (
                    banco.cards.map((cartao: any) => {
                      const gastos = cartao.invoiceAmount || 0;
                      const limite = cartao.creditLimit || 0;
                      const pctConsumida = limite > 0 ? Math.min(100, (gastos / limite) * 100) : 0;

                      return (
                        <div key={cartao.id} className="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => abrirExtratoCartao(banco.id, cartao)}>
                              <span className="text-xs">💳</span>
                              <div>
                                <p className="text-xs font-black text-gray-800 uppercase hover:text-purple-600 transition-all">{cartao.name} 📋</p>
                                <p className="text-[9px] font-bold text-gray-400">Fecha dia {cartao.closingDay || '—'} • Vence dia {cartao.dueDay || '—'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setAjustarLimiteTarget({ accountId: banco.id, card: cartao }); setNovoLimiteValue(String(limite)); }} className="bg-white border text-gray-700 text-[10px] font-black px-2 py-1 rounded-lg shadow-sm hover:bg-gray-50 transition-all">✏️ Limite</button>
                              <button onClick={() => setDeleteTarget({ type: 'CARTAO', accountId: banco.id, cardId: cartao.id })} className="bg-red-50 text-red-600 border rounded-lg p-1 text-[10px] font-bold hover:bg-red-100 transition-all">🗑️</button>
                            </div>
                          </div>
                          <div className="space-y-1 cursor-pointer" onClick={() => abrirExtratoCartao(banco.id, cartao)}>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-red-500 uppercase">Fatura: {gastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              <span className="text-gray-400">{pctConsumida.toFixed(0)}% usado</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pctConsumida > 85 ? 'bg-red-500' : 'bg-purple-600'}`} style={{ width: `${pctConsumida}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POP-UP MODAL DE TRANSFERÊNCIA */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <form onSubmit={handleExecutarTransferenciaManual} className="bg-white p-6 rounded-[2.2rem] w-full max-w-sm border shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase text-amber-600 tracking-tight flex items-center gap-1">💸 Transferência Interna</h3>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Conta de Origem</label>
              <select className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black cursor-pointer" value={sourceBankName} onChange={e => setSourceBankName(e.target.value)}>
                {bancos.map((b: any) => <option key={b.id} value={b.name}>{b.name} (Disp: R$ {b.balance})</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Conta de Destino</label>
              <select className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black cursor-pointer" value={targetBankName} onChange={e => setTargetBankName(e.target.value)}>
                {bancos.map((b: any) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Montante (R$)</label>
              <input type="number" placeholder="0.00" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black font-black" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowTransferModal(false)} className="w-1/2 bg-gray-100 text-gray-700 font-black uppercase text-xs py-3.5 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-amber-500 text-white font-black uppercase text-xs py-3.5 rounded-xl shadow-md">Transferir</button>
            </div>
          </form>
        </div>
      )}

      {/* POP-UP: MODAL CADASTRO DE BANCO */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <form onSubmit={handleCadastrarBanco} className="bg-white p-6 rounded-[2.2rem] w-full max-w-sm border shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase text-gray-900 tracking-tight">Novo Banco / Conta</h3>
            <input type="text" placeholder="Nome do Banco (ex: ITAU)" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold uppercase outline-none text-black" value={nomeBanco} onChange={e => setNomeBanco(e.target.value)} required />
            <input type="number" placeholder="Saldo Inicial (R$)" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black" value={saldoBanco} onChange={e => setSaldoBanco(e.target.value)} required />
            
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 cursor-pointer py-1">
              <input type="checkbox" checked={incluirCartaoNoBanco} onChange={e => setIncluirCartaoNoBanco(e.target.checked)} className="rounded text-purple-600" />
              <span>Quero cadastrar um cartão para essa conta</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAccountModal(false)} className="w-1/2 bg-gray-100 text-gray-700 font-black uppercase text-xs py-3.5 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-black text-white font-black uppercase text-xs py-3.5 rounded-xl shadow-md">Adicionar</button>
            </div>
          </form>
        </div>
      )}

      {/* POP-UP: MODAL CADASTRO DE CARTÃO COM INPUT DE DIAS CONTÁBEIS */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <form onSubmit={handleCadastrarCartao} className="bg-white p-6 rounded-[2.2rem] w-full max-w-sm border shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase text-gray-900 tracking-tight">Novo Cartão de Crédito</h3>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Banco de Origem</label>
              <select className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black cursor-pointer" value={selectedBancoId} onChange={e => setSelectedBancoId(e.target.value)}>
                {bancos.map((b: any) => <option key={b.id} value={b.id}>🏦 {b.name}</option>)}
              </select>
            </div>

            <input type="text" placeholder="Nome do Cartão (ex: BLACK ITAU)" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold uppercase outline-none text-black" value={nomeCartao} onChange={e => setNomeCartao(e.target.value)} required />
            <input type="number" placeholder="Limite Total (R$)" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black" value={limiteCartao} onChange={e => setLimiteCartao(e.target.value)} required />
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Dia Fechamento</label>
                <input type="number" min="1" max="31" placeholder="Dia (1-31)" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black text-center" value={closingDay} onChange={e => setClosingDay(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Dia Vencimento</label>
                <input type="number" min="1" max="31" placeholder="Dia (1-31)" className="w-full p-3.5 border rounded-xl bg-gray-50 text-xs font-bold outline-none text-black text-center" value={dueDay} onChange={e => setDueDay(e.target.value)} required />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowCardModal(false)} className="w-1/2 bg-gray-100 text-gray-700 font-black uppercase text-xs py-3.5 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-blue-600 text-white font-black uppercase text-xs py-3.5 rounded-xl shadow-md">Vincular</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EXTRATO CONTA */}
      {selectedBankForExtract && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-xl p-6 flex flex-col max-h-[80vh] border shadow-2xl">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Histórico — Mês Corrente</span>
                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Extrato — {selectedBankForExtract.name}</h2>
              </div>
              <button onClick={() => setSelectedBankForExtract(null)} className="bg-gray-100 hover:bg-gray-200 text-xs font-black uppercase px-4 py-2 rounded-xl transition-all">Fechar</button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {extractTransactions.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-xs font-black uppercase">Nenhuma movimentação este mês</p>
              ) : (
                extractTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border">
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase">{tx.description}</p>
                      <span className="text-[9px] font-bold text-gray-400 block">{tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                    <span className={`text-xs font-black ${tx.type === 'RECEITA' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'RECEITA' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXTRATO CARTÃO */}
      {selectedCardForExtract && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-xl p-6 flex flex-col max-h-[80vh] border shadow-2xl">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Histórico de Crédito</span>
                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Extrato Cartão — {selectedCardForExtract.name}</h2>
              </div>
              <button onClick={() => setSelectedCardForExtract(null)} className="bg-gray-100 hover:bg-gray-200 text-xs font-black uppercase px-4 py-2 rounded-xl transition-all">Fechar</button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Faturamento do Mês em Aberto</p>
                  <p className="text-xl font-black text-red-500">R$ {Number(selectedCardForExtract.invoiceAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                {Number(selectedCardForExtract.invoiceAmount || 0) > 0 && (
                  <button onClick={handlePagarFaturaCompleta} className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-3 rounded-xl shadow-md transition-all">⚡ Liquidar / Pagar Fatura</button>
                )}
              </div>

              {cardTransactions.length === 0 ? (
                <p className="text-center py-12 text-xs font-black text-gray-400 uppercase">Nenhuma compra pendente neste cartão</p>
              ) : (
                cardTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-gray-900 uppercase">{tx.description}</p>
                      <span className="text-[9px] font-bold text-gray-400 block">{new Date(tx.transactionDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-red-500">R$ {tx.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <select className="p-1.5 rounded-lg text-[9px] font-black uppercase border outline-none cursor-pointer bg-gray-50" value={tx.category || 'EM_ABERTO'} onChange={(e) => handleMudarStatusGasto(tx.id, e.target.value)}>
                        <option value="EM_ABERTO">⏳ Aberto</option>
                        <option value="PAGO">✅ Pago</option>
                        <option value="ATRASADO">🚨 Atrasado</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTAR LIMITE */}
      {ajustarLimiteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white text-black rounded-[2.2rem] w-full max-w-sm p-6 space-y-4 shadow-2xl border">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">⚡</div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black uppercase tracking-tight">Ajustar Limite Total</h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase">Defina o novo limite para o cartão {ajustarLimiteTarget.card.name}</p>
            </div>
            <div>
              <input type="number" className="w-full p-3.5 border rounded-xl bg-gray-50 font-black text-sm text-center outline-none text-black focus:border-purple-500 transition-all" value={novoLimiteValue} onChange={e => setNovoLimiteValue(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setAjustarLimiteTarget(null)} className="w-1/2 bg-gray-100 text-gray-700 font-black uppercase text-xs py-3.5 rounded-xl">Cancelar</button>
              <button onClick={ajustarLimiteSubmit} className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs py-3.5 rounded-xl shadow-md transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO RETIFICADO */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 text-center space-y-4 shadow-2xl border animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">🗑️</div>
            <h3 className="text-base font-black uppercase tracking-tight">Confirmar exclusão?</h3>
            <p className="text-xs text-gray-400 font-bold uppercase px-2">Essa operação removerá permanentemente o {deleteTarget.type.toLowerCase()} do sistema e recalculará as dependências.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="w-1/2 bg-gray-100 text-gray-700 font-black uppercase text-xs py-3 rounded-xl">Voltar</button>
              <button onClick={executarExclusaoCustom} className="w-1/2 bg-red-600 text-white font-black uppercase text-xs py-3 rounded-xl shadow-md">Remover</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}