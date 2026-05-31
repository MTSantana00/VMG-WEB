'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import OnboardingBot from './components/OnboardingBot';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('mensal'); 
  const [statusFiltro, setStatusFiltro] = useState('TODOS'); 
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editBankId, setEditBankId] = useState('');
  const [editCardId, setEditCardId] = useState('');

  const verificarOnboardingECarregar = async () => {
    try {
      const resStatus = await fetch('http://localhost:8080/api/onboarding/status');
      if (resStatus.ok) {
        const statusData = await resStatus.json();
        if (statusData.onboardingCompleted) {
          setShowOnboarding(false);
          
          const resAccounts = await fetch('http://localhost:8080/api/accounts');
          if (resAccounts.ok) setBancos(await resAccounts.json());

          const resTx = await fetch('http://localhost:8080/api/transactions');
          const dataTx = await resTx.json();
          const sortedTx = dataTx.sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
          setTransactions(sortedTx);

          const resGoals = await fetch('http://localhost:8080/api/goals');
          const dataGoals = await resGoals.json();
          setGoals(dataGoals);
        } else {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error("Erro ao sincronizar dados com o ecossistema VMG:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    verificarOnboardingECarregar(); 

    const handleWindowFocus = () => { verificarOnboardingECarregar(); };
    const escutarOnboardingCompleto = () => { setShowOnboarding(false); verificarOnboardingECarregar(); };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('vmg-onboarding-complete', escutarOnboardingCompleto);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('vmg-onboarding-complete', escutarOnboardingCompleto);
    };
  }, []);

  // 🎯 CORREÇÃO DO BUG 3: Captura o erro customizado e exibe o Pop-up de aviso informando que já foi pago
  const handleStatusChange = async (id: number, novoStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/transactions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: novoStatus })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        if (errData.error === 'JA_PAGO') {
          alert("🚨 Atenção: Esta fatura/lançamento já consta como PAGO no sistema! Não é possível pagar duas vezes o mesmo registro.");
          await verificarOnboardingECarregar();
          return;
        }
      }
      await verificarOnboardingECarregar();
    } catch (error) {
      console.error(error);
    }
  };

  const salvarEdicaoTransacao = async () => {
    if (!selectedTransaction) return;
    try {
      const payload = {
        description: editDesc,
        amount: Number(editAmount),
        transactionDate: selectedTransaction.original.transactionDate,
        type: selectedTransaction.original.type,
        category: selectedTransaction.original.category,
        account: editBankId ? { id: Number(editBankId) } : null,
        card: editCardId ? { id: Number(editCardId) } : null
      };

      const res = await fetch(`http://localhost:8080/api/transactions/${selectedTransaction.original.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        await verificarOnboardingECarregar();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcluirTransacaoDirect = async (id: number) => {
    if (!confirm("Deseja apagar permanentemente este registro?")) return;
    try {
      const res = await fetch(`http://localhost:8080/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsModalOpen(false);
        await verificarOnboardingECarregar();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center font-black text-xl text-gray-900 animate-pulse">CARREGANDO VMG DASHBOARD...</div>;
  }

  if (showOnboarding) {
    return (
      <div className="w-screen h-screen bg-gray-950 overflow-hidden fixed inset-0 z-[999]">
        <OnboardingBot onComplete={() => setShowOnboarding(false)} />
      </div>
    );
  }

  const hoje = new Date();
  const proximoMes = hoje.getMonth() === 11 ? 0 : hoje.getMonth() + 1;
  const anoProximoMes = hoje.getMonth() === 11 ? hoje.getFullYear() + 1 : hoje.getFullYear();

  const receitaMensal = transactions.filter((t: any) => {
    const d = new Date(t.transactionDate);
    const dataAjustada = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return t.type === 'RECEITA' && dataAjustada.getMonth() === hoje.getMonth() && dataAjustada.getFullYear() === hoje.getFullYear();
  }).reduce((acc, t: any) => acc + Number(t.amount), 0);

  const despesaMensal = transactions.filter((t: any) => {
    const d = new Date(t.transactionDate);
    const dataAjustada = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return (t.type === 'DESPESA') && dataAjustada.getMonth() === hoje.getMonth() && dataAjustada.getFullYear() === hoje.getFullYear();
  }).reduce((acc, t: any) => acc + Number(t.amount), 0);

  const despesaTotalProjetada = transactions.filter((t: any) => t.type === 'DESPESA').reduce((acc, t: any) => acc + Number(t.amount), 0);
  const saldoMensalAtual = bancos.reduce((sum: number, banco: any) => sum + Number(banco.balance || 0), 0);

  const transactionsFiltradas = transactions.filter((t: any) => {
    const descLower = (t.description || '').toLowerCase();
    const ehDoPdf = descLower.includes('[pdf]');

    let passaTempo = true;
    if (!ehDoPdf) {
      const d = new Date(t.transactionDate);
      const dataAjustada = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      
      if (activeTab === 'mensal') {
        passaTempo = dataAjustada.getMonth() === hoje.getMonth() && dataAjustada.getFullYear() === hoje.getFullYear();
      } else if (activeTab === 'proximo') {
        passaTempo = dataAjustada.getMonth() === proximoMes && dataAjustada.getFullYear() === anoProximoMes;
      }
    }

    const statusAtual = t.category === 'PAGO' || t.category === 'EM_ABERTO' || t.category === 'ATRASADO' ? t.category : 'EM_ABERTO';
    let passaStatus = statusFiltro === 'TODOS' || statusAtual === statusFiltro;

    return passaTempo && passaStatus;
  });

  const abrirDetalhes = (transacao: any) => {
    setEditDesc(transacao.description);
    setEditAmount(String(transacao.amount));
    setEditBankId(transacao.account?.id ? String(transacao.account.id) : '');
    setEditCardId(transacao.card?.id ? String(transacao.card.id) : '');

    setSelectedTransaction({ original: transacao, baseName: transacao.description });
    setIsModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 space-y-8 text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter">VMG DASHBOARD</h1>
            <Link href="/ajustes" className="text-xs bg-white border border-gray-200 text-gray-500 hover:text-black font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow-sm transition-all">
              ⚙️ Ajustes
            </Link>
          </div>
          <Link href="/magic" className="bg-black text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-gray-900 transition-all active:scale-95">✨ NOVA MÁGICA</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo em Conta</p>
            <p className="text-2xl font-black mt-1 text-green-600">{saldoMensalAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 text-gray-900 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Receita Mensal</p>
            <p className="text-2xl font-black mt-1">{receitaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Despesa Mensal Atual</p>
            <p className="text-2xl font-black mt-1">{despesaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 text-red-500 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider">Despesa Projetada Total</p>
            <p className="text-2xl font-black mt-1">{despesaTotalProjetada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex bg-gray-200/60 p-1.5 rounded-2xl w-full max-w-md border border-gray-200 shadow-inner">
            {['mensal', 'proximo', 'todos'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}>
                {tab === 'mensal' ? 'Mês Ativo' : tab === 'proximo' ? 'Próximo Mês' : 'Ver Todos'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/bancos" className="bg-white border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
              <span>🏦</span> Ver Meus Bancos
            </Link>
          </div>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit border text-[10px] font-black uppercase tracking-wider">
          {['TODOS', 'EM_ABERTO', 'PAGO', 'ATRASADO'].map((st) => (
            <button key={st} onClick={() => setStatusFiltro(st)} className={`px-4 py-1.5 rounded-lg transition-all ${statusFiltro === st ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {st === 'TODOS' ? '📋 Todos os Status' : st === 'EM_ABERTO' ? '⏳ Em Aberto' : st === 'PAGO' ? '✅ Pago' : '🚨 Atrasado'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden p-4 shadow-sm">
          {transactionsFiltradas.length === 0 ? (
            <div className="p-16 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum lançamento encontrado nesta condição.</div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-2">Vencimento</th>
                  <th className="px-6 py-2">Descrição</th>
                  <th className="px-6 py-2">Situação</th>
                  <th className="px-6 py-2 text-right">Valor</th>
                  <th className="px-6 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactionsFiltradas.map((t: any) => {
                  const currentStatus = t.category === 'PAGO' || t.category === 'EM_ABERTO' || t.category === 'ATRASADO' ? t.category : 'EM_ABERTO';
                  return (
                    <tr key={t.id} className="bg-gray-50/50 hover:bg-gray-100/70 transition-all">
                      <td className="px-6 py-4 text-sm font-bold text-gray-500 rounded-l-2xl">
                        {t.transactionDate ? t.transactionDate.split('-').reverse().join('/') : '—'}
                      </td>
                      <td className="px-6 py-4 font-black text-gray-800">
                        <div className="flex flex-col">
                          <span>{t.description}</span>
                          <div className="flex items-center flex-wrap gap-2 mt-1.5">
                            {t.card && <span className="text-[9px] bg-purple-50 text-purple-600 font-black px-2 py-0.5 rounded-md border border-purple-100 uppercase tracking-wider">💳 {t.card.name}</span>}
                            {t.account && <span className="text-[9px] bg-blue-50 text-blue-600 font-black px-2 py-0.5 rounded-md border border-blue-100 uppercase tracking-wider">💰 {t.account.name}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={currentStatus} 
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className={`text-[10px] font-black px-3 py-1.5 rounded-xl border outline-none cursor-pointer transition-all ${
                            currentStatus === 'PAGO' ? 'bg-green-50 border-green-200 text-green-700' :
                            currentStatus === 'ATRASADO' ? 'bg-red-50 border-red-200 text-red-700' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          <option value="EM_ABERTO">⏳ EM ABERTO</option>
                          <option value="PAGO">✅ PAGO</option>
                          <option value="ATRASADO">🚨 ATRASADO</option>
                        </select>
                      </td>
                      <td className={`px-6 py-4 text-right font-black ${t.type === 'RECEITA' ? 'text-green-500' : 'text-red-500'}`}>
                        {t.type === 'RECEITA' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-4 text-center rounded-r-2xl">
                        <button onClick={() => abrirDetalhes(t)} className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl hover:bg-gray-800 transition-all">✏️ Editar / Ajustar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE AJUSTE */}
      {isModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col border border-gray-100">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter mb-4">Ajustar Lançamento</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Descrição</label>
                <input type="text" className="w-full p-3 border rounded-xl bg-gray-50 text-xs font-bold text-black outline-none" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Valor (R$)</label>
                <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 text-xs font-bold text-black outline-none" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Alterar Conta Bancária</label>
                <select className="w-full p-3 border rounded-xl bg-gray-50 text-xs font-bold text-black outline-none" value={editBankId} onChange={e => setEditBankId(e.target.value)}>
                  <option value="">NENHUMA CONTA VINCULADA</option>
                  {bancos.map((b: any) => <option key={b.id} value={b.id}>💰 {b.name}</option>)}
                </select>
              </div>

              {editBankId && (
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Atrelar ao Cartão de Crédito</label>
                  <select className="w-full p-3 border rounded-xl bg-gray-50 text-xs font-bold text-black outline-none" value={editCardId} onChange={e => setEditCardId(e.target.value)}>
                    <option value="">PAGO VIA PIX / DÉBITO À VISTA</option>
                    {bancos.find((b: any) => String(b.id) === String(editBankId))?.cards?.map((c: any) => (
                      <option key={c.id} value={c.id}>💳 CARTÃO {c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => handleExcluirTransacaoDirect(selectedTransaction.original.id)} className="bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs uppercase px-4 py-3 rounded-xl">🗑️ Apagar</button>
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-black text-xs uppercase py-3 rounded-xl">Voltar</button>
              <button onClick={salvarEdicaoTransacao} className="flex-1 bg-purple-600 text-white font-black text-xs uppercase py-3 rounded-xl shadow-md">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}