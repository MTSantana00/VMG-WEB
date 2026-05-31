'use client';

import { useState, useRef, useEffect } from 'react';

interface OnboardingBotProps {
  onComplete: () => void;
}

export default function OnboardingBot({ onComplete }: OnboardingBotProps) {
  const [step, setStep] = useState(1);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [invests, setInvests] = useState<boolean | null>(null);
  const [salaryStr, setSalaryStr] = useState('');
  const [salaryBankName, setSalaryBankName] = useState(''); 

  const [bancosList, setBancosList] = useState<Array<{ name: string; initialBalance: number }>>([]);
  const [currentBank, setCurrentBank] = useState('');
  const [currentBankBalanceStr, setCurrentBankBalanceStr] = useState('');

  const [gastosList, setGastosList] = useState<Array<{ description: string; amount: number; paymentMethod: string; installment: boolean; installmentsCount: number }>>([]);
  const [currentGastoDesc, setCurrentGastoDesc] = useState('');
  const [currentGastoValorStr, setCurrentGastoValorStr] = useState('');
  const [currentGastoMethod, setCurrentGastoMethod] = useState(''); 
  const [currentGastoInstallment, setCurrentGastoInstallment] = useState(false);
  const [currentGastoCount, setCurrentGastoCount] = useState('2');

  const [sonhosList, setSonhosList] = useState<Array<{ name: string; target: number; deadline?: string | null }>>([]);
  const [currentSonhoNome, setCurrentSonhoNome] = useState('');
  const [currentSonhoAlvoStr, setCurrentSonhoAlvoStr] = useState('');
  const [currentSonhoDeadline, setCurrentSonhoDeadline] = useState('');

  const [desejaImportarPdf, setDesejaImportarPdf] = useState<boolean | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // 🎯 CORREÇÃO CRÍTICA: Agora o seletor consome os nomes das strings do formulário da lista reativa
  const [nomeBancoSelecionadoPdf, setNomeBancoSelecionadoPdf] = useState<string>('');
  const [showCriarBancoRapidoPdf, setShowCriarBancoRapidoPdf] = useState(false);
  const [pdfNovoBancoNome, setPdfNovoBancoNome] = useState('');
  const [pdfNovoBancoSaldo, setPdfNovoBancoSaldo] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSteps = 9; 

  useEffect(() => {
    if (bancosList.length > 0 && !nomeBancoSelecionadoPdf) {
      setNomeBancoSelecionadoPdf(bancosList[0].name);
    }
  }, [bancosList]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const limparMoedaParaFloat = (texto: string) => {
    if (!texto) return 0;
    let limpo = texto.replace('R$', '').trim();
    limpo = limpo.replace(/\./g, '');
    limpo = limpo.replace(',', '.');
    return parseFloat(limpo) || 0;
  };

  const nextStep = async () => {
    if (step === 1 && !name.trim()) return;
    if (step === 2 && !profession.trim()) return;
    if (step === 3 && invests === null) return;
    if (step === 4 && bancosList.length === 0 && !currentBank.trim()) return;
    if (step === 5 && (!salaryStr || !salaryBankName)) return; 

    if (step === 4 && currentBank.trim()) {
      const novoBanco = { name: currentBank.trim().toUpperCase(), initialBalance: limparMoedaParaFloat(currentBankBalanceStr) };
      setBancosList([...bancosList, novoBanco]);
      if (!nomeBancoSelecionadoPdf) setNomeBancoSelecionadoPdf(novoBanco.name);
      setCurrentBank('');
      setCurrentBankBalanceStr('');
    }
    if (step === 6 && currentGastoDesc.trim() && currentGastoValorStr && currentGastoMethod) {
      setGastosList([...gastosList, { 
        description: currentGastoDesc.trim(), 
        amount: limparMoedaParaFloat(currentGastoValorStr), 
        paymentMethod: currentGastoMethod,
        installment: currentGastoInstallment,
        installmentsCount: currentGastoInstallment ? parseInt(currentGastoCount) : 1
      }]);
      setCurrentGastoDesc('');
      setCurrentGastoValorStr('');
      setCurrentGastoMethod('');
      setCurrentGastoInstallment(false);
      setCurrentGastoCount('2');
    }
    if (step === 7 && currentSonhoNome.trim() && currentSonhoAlvoStr) {
      let deadlineFormatado = null;
      if (currentSonhoDeadline.trim() && currentSonhoDeadline.includes('/')) {
        const partes = currentSonhoDeadline.trim().split('/');
        if (partes.length === 3) {
          deadlineFormatado = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
      } else {
        deadlineFormatado = currentSonhoDeadline.trim() || null;
      }

      setSonhosList([...sonhosList, { 
        name: currentSonhoNome.trim(), 
        target: limparMoedaParaFloat(currentSonhoAlvoStr),
        deadline: deadlineFormatado
      }]);
      setCurrentSonhoNome('');
      setCurrentSonhoAlvoStr('');
      setCurrentSonhoDeadline('');
    }

    if (step === 8) {
      setStep(9);
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await enviarOnboardingCompleto();
    }
  };

  const backStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddMoreBancos = () => {
    if (!currentBank.trim()) return;
    const novoBanco = { name: currentBank.trim().toUpperCase(), initialBalance: limparMoedaParaFloat(currentBankBalanceStr) };
    setBancosList([...bancosList, novoBanco]);
    if (!nomeBancoSelecionadoPdf) setNomeBancoSelecionadoPdf(novoBanco.name);
    setCurrentBank('');
    setCurrentBankBalanceStr('');
  };

  const handleAddMoreGastos = () => {
    if (!currentGastoDesc.trim() || !currentGastoValorStr || !currentGastoMethod) return;
    setGastosList([...gastosList, { 
      description: currentGastoDesc.trim(), 
      amount: limparMoedaParaFloat(currentGastoValorStr), 
      paymentMethod: currentGastoMethod,
      installment: currentGastoInstallment,
      installmentsCount: currentGastoInstallment ? parseInt(currentGastoCount) : 1
    }]);
    setCurrentGastoDesc('');
    setCurrentGastoValorStr('');
    setCurrentGastoMethod('');
    setCurrentGastoInstallment(false);
    setCurrentGastoCount('2');
  };

  const handleAddMoreSonhos = () => {
    if (!currentSonhoNome.trim() || !currentSonhoAlvoStr) return;
    
    let deadlineFormatado = null;
    if (currentSonhoDeadline.trim() && currentSonhoDeadline.includes('/')) {
      const partes = currentSonhoDeadline.trim().split('/');
      if (partes.length === 3) {
        deadlineFormatado = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    } else {
      deadlineFormatado = currentSonhoDeadline.trim() || null;
    }

    setSonhosList([...sonhosList, { 
      name: currentSonhoNome.trim(), 
      target: limparMoedaParaFloat(currentSonhoAlvoStr),
      deadline: deadlineFormatado
    }]);
    setCurrentSonhoNome('');
    setCurrentSonhoAlvoStr('');
    setCurrentSonhoDeadline('');
  };

  const handleCriarBancoRapidoNoPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfNovoBancoNome) return;
    const bNome = pdfNovoBancoNome.toUpperCase().trim();
    const novoB = { name: bNome, initialBalance: Number(pdfNovoBancoSaldo || 0) };
    
    setBancosList([...bancosList, novoB]);
    setNomeBancoSelecionadoPdf(bNome);
    setPdfNovoBancoNome('');
    setPdfNovoBancoSaldo('');
    setShowCriarBancoRapidoPdf(false);
  };

  const enviarOnboardingCompleto = async () => {
    setLoadingSubmit(true);
    const salarioNumerico = limparMoedaParaFloat(salaryStr);

    try {
      // 1. Executa a gravação estrutural das carteiras, despesas e metas de uma vez só no Java
      const resSetup = await fetch('http://localhost:8080/api/onboarding/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          profession: profession.trim(),
          invests: invests,
          salary: salarioNumerico,
          salaryBankName: salaryBankName, 
          banks: bancosList, 
          expenses: gastosList,
          goals: sonhosList
        })
      });

      // 2. Se a gravação passou e o usuário anexou o extrato, vincula o PDF ao ID real gerado
      if (resSetup.ok && desejaImportarPdf && pdfFile && nomeBancoSelecionadoPdf) {
        const resContas = await fetch('http://localhost:8080/api/accounts');
        if (resContas.ok) {
          const contasBancoDados = await resContas.json();
          const contaCorrespondente = contasBancoDados.find(
            (b: any) => b.name.toUpperCase().trim() === nomeBancoSelecionadoPdf.toUpperCase().trim()
          );

          if (contaCorrespondente) {
            const formData = new FormData();
            formData.append('file', pdfFile);
            await fetch(`http://localhost:8080/api/transactions/importar-extrato?accountId=${contaCorrespondente.id}`, {
              method: 'POST',
              body: formData
            });
          }
        }
      }

      const resComplete = await fetch('http://localhost:8080/api/onboarding/complete', { method: 'POST' });
      if (resComplete.ok) {
        window.dispatchEvent(new CustomEvent('vmg-onboarding-complete', { detail: { name: name.trim() } }));
        onComplete();
      }
    } catch (error) {
      console.error(error);
      window.dispatchEvent(new CustomEvent('vmg-onboarding-complete', { detail: { name: name.trim() } }));
      onComplete();
    } finally {
      setLoadingSubmit(false);
    }
  };

  const formatarMoedaReal = (valor: string, setValorStr: (v: string) => void) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    const valorOp = (Number(apenasNumeros) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    setValorStr(apenasNumeros ? valorOp : '');
  };

  const progressoPct = (step / totalSteps) * 100;

  if (loadingSubmit) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-xs uppercase tracking-widest animate-pulse">Sincronizando Carteiras VMG...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-between p-6 lg:p-12 font-sans select-none">
      <div className="w-full max-w-xl space-y-2 mt-4">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
          <span>Configuração Inteligente do Espaço</span>
          <span>Passo {step} de {totalSteps}</span>
        </div>
        <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden p-0.5 border border-gray-800">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progressoPct}%` }} />
        </div>
      </div>

      <div className="w-full max-w-xl bg-gray-900/40 border border-gray-800/60 p-8 lg:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-md my-auto space-y-8 transition-all">
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">🤖</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Olá! Sou o assistente do VMG. Para começarmos, qual é o seu nome?</h2>
            </div>
            <input type="text" placeholder="Digite seu nome ou apelido..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && nextStep()} className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-2xl px-5 py-4 font-bold outline-none text-base transition-all placeholder:text-gray-600" autoFocus />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">💼</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Prazer, {name.split(' ')[0]}! Qual é a sua profissão ou área de atuação hoje?</h2>
            </div>
            <input type="text" placeholder="Ex: Tecnologia, Marketing, Engenharia..." value={profession} onChange={(e) => setProfession(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && nextStep()} className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-2xl px-5 py-4 font-bold outline-none text-base transition-all placeholder:text-gray-600" autoFocus />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">📈</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Você já possui o hábito de realizar algum tipo de investimento?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => { setInvests(true); setTimeout(nextStep, 200); }} className={`p-5 rounded-2xl border font-bold text-left transition-all ${invests === true ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'}`}>🚀 Sim, invisto com frequência</button>
              <button onClick={() => { setInvests(false); setTimeout(nextStep, 200); }} className={`p-5 rounded-2xl border font-bold text-left transition-all ${invests === false ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'}`}>🏠 Focado em organizar primeiro</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">🏦</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Quais contas bancárias você utiliza e qual o saldo atual de cada uma?</h2>
              {bancosList.length > 0 && (
                <div className="flex flex-col gap-1.5 p-3 bg-gray-950/60 rounded-xl border border-gray-800">
                  {bancosList.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                      <span>🏛️ {b.name}</span>
                      <span className="text-purple-400">R$ {b.initialBalance.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome do Banco (Ex: Itaú, Nubank)..." value={currentBank} onChange={(e) => setCurrentBank(e.target.value)} className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm" autoFocus />
              <div className="flex gap-2">
                <input type="text" placeholder="Saldo Atual (R$ 0,00)" value={currentBankBalanceStr} onChange={(e) => formatarMoedaReal(e.target.value, setCurrentBankBalanceStr)} className="flex-1 bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm text-purple-400" />
                <button type="button" onClick={handleAddMoreBancos} className="bg-gray-900 border border-gray-800 text-purple-400 font-black text-[10px] px-4 rounded-xl uppercase tracking-wider hover:bg-gray-850 transition-all">+ Add Banco</button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">💵</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Qual é o seu salário líquido mensal e em qual conta você o recebe?</h2>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Valor do Salário (R$ 0,00)" value={salaryStr} onChange={(e) => formatarMoedaReal(e.target.value, setSalaryStr)} className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-black outline-none text-xl text-purple-400" autoFocus />
              <select value={salaryBankName} onChange={(e) => setSalaryBankName(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 font-bold outline-none text-sm text-gray-400 cursor-pointer uppercase">
                <option value="">Selecione o banco de recebimento...</option>
                {bancosList.map((b, i) => (
                  <option key={i} value={b.name}>{b.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">☕</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Teve algum gasto hoje? Se sim, de qual banco saiu esse valor?</h2>
              {gastosList.length > 0 && (
                <div className="flex flex-col gap-1 p-2.5 bg-gray-950/60 rounded-xl border border-gray-800 max-h-24 overflow-y-auto">
                  {gastosList.map((g, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                      <span>🛍️ {g.description} ({g.paymentMethod}) {g.installment ? `[${g.installmentsCount}x]` : ''}</span>
                      <span className="text-red-400">R$ {g.amount.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="O que você comprou? (Ex: Almoço)..." value={currentGastoDesc} onChange={(e) => setCurrentGastoDesc(e.target.value)} className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm" autoFocus />
              <div className="input-group flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Quanto custou total? (R$ 0,00)" value={currentGastoValorStr} onChange={(e) => formatarMoedaReal(e.target.value, setCurrentGastoValorStr)} className="flex-1 bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm text-red-400" />
                <select value={currentGastoMethod} onChange={(e) => setCurrentGastoMethod(e.target.value)} className="bg-gray-950 border border-gray-800 text-[10px] font-black uppercase rounded-xl px-3 py-3 sm:py-0 text-purple-400 outline-none cursor-pointer">
                  <option value="">Qual banco pagou?</option>
                  {bancosList.map((b, i) => (
                    <option key={i} value={b.name}>BA: {b.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4 bg-gray-950 border border-gray-800 p-4 rounded-xl">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 cursor-pointer select-none">
                  <input type="checkbox" checked={currentGastoInstallment} onChange={(e) => setCurrentGastoInstallment(e.target.checked)} className="accent-purple-500 w-4 h-4 rounded cursor-pointer" />
                  Gasto Parcelado
                </label>
                {currentGastoInstallment && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-left duration-200">
                    <span className="text-xs font-bold text-gray-500 uppercase">Qtd:</span>
                    <input type="number" min="2" max="48" value={currentGastoCount} onChange={(e) => setCurrentGastoCount(e.target.value)} className="w-16 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 text-center font-black text-sm text-purple-400 outline-none" />
                  </div>
                )}
              </div>
              <button type="button" onClick={handleAddMoreGastos} className="w-full bg-gray-900 border border-gray-800 text-purple-400 font-black text-[10px] py-2.5 rounded-xl uppercase tracking-wider hover:bg-gray-850 transition-all">+ Add Gasto</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">🎯</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Quais os seus sonhos ou metas financeiras para este ano?</h2>
              {sonhosList.length > 0 && (
                <div className="flex flex-col gap-1 p-2.5 bg-gray-950/60 rounded-xl border border-gray-800">
                  {sonhosList.map((s, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                      <span>🎯 {s.name} {s.deadline ? `(Até ${s.deadline})` : ''}</span>
                      <span className="text-green-400">Alvo: R$ {s.target.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nome do Sonho (Ex: Viagem)..." value={currentSonhoNome} onChange={(e) => setCurrentSonhoNome(e.target.value)} className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Valor Alvo Total (R$ 0,00)" value={currentSonhoAlvoStr} onChange={(e) => formatarMoedaReal(e.target.value, setCurrentSonhoAlvoStr)} className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm text-green-400" />
                <input type="text" placeholder="Prazo Limite (DD/MM/YYYY)" value={currentSonhoDeadline} onChange={(e) => setCurrentSonhoDeadline(e.target.value)} className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 font-bold outline-none text-sm text-gray-400" />
              </div>
              <button type="button" onClick={handleAddMoreSonhos} className="w-full bg-gray-900 border border-gray-800 text-purple-400 font-black text-[10px] py-2.5 rounded-xl uppercase tracking-wider hover:bg-gray-850 transition-all">+ Add Sonho</button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">📄</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">Deseja carregar um arquivo de extrato bancário em PDF agora?</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => { setDesejaImportarPdf(true); nextStep(); }} className="p-5 rounded-2xl border border-gray-800 bg-gray-950 font-bold text-left hover:border-purple-500 transition-all">📤 Sim, quero subir o arquivo</button>
              <button type="button" onClick={() => { setDesejaImportarPdf(false); setStep(9); }} className="p-5 rounded-2xl border border-gray-800 bg-gray-950 font-bold text-left hover:border-gray-700 transition-all text-gray-500">⏩ Não, configurar depois</button>
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xl">🚀</span>
              <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">
                {desejaImportarPdf ? 'Vincular e Importar Extrato' : 'Tudo pronto para inicializar seu ecossistema!'}
              </h2>
            </div>

            {desejaImportarPdf && (
              <div className="space-y-4 text-left">
                {!showCriarBancoRapidoPdf ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Mapear extrato para qual conta?</label>
                    
                    {/* 🎯 CORREÇÃO INTEGRAÇÃO ONBOARDING: Renderiza dinamicamente as strings locais adicionadas no Passo 4 */}
                    <select className="w-full p-3.5 bg-gray-950 border border-gray-800 text-white font-bold text-xs rounded-xl outline-none cursor-pointer uppercase" value={nomeBancoSelecionadoPdf} onChange={e => setNomeBancoSelecionadoPdf(e.target.value)}>
                      {bancosList.map((b, i) => (
                        <option key={i} value={b.name}>🏦 CONTA INTERNA: {b.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowCriarBancoRapidoPdf(true)} className="text-[10px] text-purple-400 font-black uppercase tracking-wider hover:underline block mt-1">+ Cadastrar outra conta antes</button>
                  </div>
                ) : (
                  <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-800 space-y-3">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Nova Conta Bancária</p>
                    <input type="text" placeholder="Nome do Banco" className="w-full p-2.5 bg-gray-900 rounded-lg text-xs font-bold text-white outline-none border border-gray-800 uppercase" value={pdfNovoBancoNome} onChange={e => setPdfNovoBancoNome(e.target.value)} />
                    <input type="number" placeholder="Saldo Atual" className="w-full p-2.5 bg-gray-900 rounded-lg text-xs font-bold text-white outline-none border border-gray-800" value={pdfNovoBancoSaldo} onChange={e => setPdfNovoBancoSaldo(e.target.value)} />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowCriarBancoRapidoPdf(false)} className="bg-gray-900 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase">Voltar</button>
                      <button type="button" onClick={handleCriarBancoRapidoNoPdf} className="bg-purple-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase text-white">Criar e Mapear</button>
                    </div>
                  </div>
                )}

                {nomeBancoSelecionadoPdf && !showCriarBancoRapidoPdf && (
                  <div onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-950 border-2 border-dashed border-gray-800 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-all">
                    <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <span className="text-xl">📁</span>
                    <p className="font-bold text-xs text-gray-400 mt-2">{pdfFile ? `✅ Selecionado: ${pdfFile.name}` : 'Clique para carregar o arquivo PDF'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-800/50">
          <div className="flex items-center gap-2 bg-purple-950/20 border border-purple-900/30 px-3 py-2 rounded-xl max-w-xs">
            <span className="text-xs">🔒</span>
            <p className="text-[9px] font-black uppercase text-purple-400 tracking-wider leading-tight">
              Ambiente de testes 100% isolado. Seus dados são confidenciais.
            </p>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {step > 1 && <button type="button" onClick={backStep} className="bg-gray-950 border border-gray-800 text-gray-400 font-bold text-xs uppercase tracking-widest px-4 py-4 rounded-xl hover:text-white transition-all">← Voltar</button>}
            {step !== 3 && step !== 8 && !showCriarBancoRapidoPdf && (
              <button type="button" onClick={nextStep} className="bg-white text-black font-black text-xs uppercase tracking-widest px-6 py-4 rounded-xl hover:bg-gray-200 transition-all shadow-md">
                {step === totalSteps ? '✨ Concluir Mágica' : 'Avançar →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}