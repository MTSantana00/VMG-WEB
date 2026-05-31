'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SonhosPage() {
  const router = useRouter();
  const [sonhos, setSonhos] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Banco de Emojis
  const emojiOptions = ['🎯', '🚗', '🏠', '✈️', '💻', '🎓', '💍', '🌴', '💰', '📈', '🎸', '👟', '🚲', '🎁', '🍔'];

  // Estados para Criar Novo Sonho
  const [showCriarModal, setShowCriarModal] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoAlvo, setNovoAlvo] = useState('');
  const [novoDeadline, setNovoDeadline] = useState('');
  const [novoEmoji, setNovoEmoji] = useState('🎯');

  // Estados de Operação / Edição do Modal Principal
  const [activeGoal, setActiveGoal] = useState<any | null>(null);
  const [operationType, setOperationType] = useState<'DEPOSIT' | 'WITHDRAW' | 'EDIT' | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amountValue, setAmountValue] = useState('');
  
  // 🎯 ESTADOS COMPLEMENTARES PARA EDIÇÃO DA META ATIVA
  const [editNome, setEditNome] = useState('');
  const [editAlvo, setEditAlvo] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editEmoji, setEditEmoji] = useState('🎯');

  // Histórico e Feedback
  const [goalHistoryList, setGoalHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const carregarDadosIniciais = async () => {
    try {
      const resGoals = await fetch('http://localhost:8080/api/goals');
      if (resGoals.ok) setSonhos(await resGoals.json());

      const resAccounts = await fetch('http://localhost:8080/api/accounts');
      if (resAccounts.ok) {
        const dataAccounts = await resAccounts.json();
        setBancos(dataAccounts);
        if (dataAccounts.length > 0) setSelectedAccountId(dataAccounts[0].id.toString());
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarHistoricoSonho = async (goalId: number) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`http://localhost:8080/api/goals/${goalId}/history`);
      if (res.ok) setGoalHistoryList(await res.json());
    } catch (error) {
      console.error('Erro ao buscar histórico do sonho:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { carregarDadosIniciais(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const abrirPainelMeta = (sonho: any) => {
    setActiveGoal(sonho);
    setOperationType('DEPOSIT');
    setAmountValue('');
    
    // Injeta os valores atuais nos campos de edição caso o usuário clique na aba "Editar"
    setEditNome(sonho.name);
    setEditAlvo(sonho.targetAmount.toString());
    setEditDeadline(sonho.deadline || '');
    setEditEmoji(sonho.emoji || '🎯');

    carregarHistoricoSonho(sonho.id);
  };

  const handleCriarSonho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoAlvo) return;

    let deadlineFormatado = null;
    if (novoDeadline.trim() && novoDeadline.includes('/')) {
      const partes = novoDeadline.trim().split('/');
      if (partes.length === 3) {
        deadlineFormatado = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    } else {
      deadlineFormatado = novoDeadline.trim() || null;
    }

    try {
      const res = await fetch('http://localhost:8080/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: novoNome.toUpperCase().trim(),
          targetAmount: Number(novoAlvo),
          currentAmount: 0,
          deadline: deadlineFormatado,
          emoji: novoEmoji
        })
      });

      if (res.ok) {
        setNovoNome(''); setNovoAlvo(''); setNovoDeadline(''); setNovoEmoji('🎯');
        setShowCriarModal(false);
        await carregarDadosIniciais();
        showToast("Novo objetivo cadastrado com sucesso!");
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleSalvarEdicaoSonho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal || !editNome || !editAlvo) return;

    let deadlineFormatado = editDeadline;
    if (editDeadline.includes('/')) {
      const partes = editDeadline.trim().split('/');
      if (partes.length === 3) {
        deadlineFormatado = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
      }
    }

    try {
      const res = await fetch('http://localhost:8080/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeGoal.id,
          name: editNome.toUpperCase().trim(),
          targetAmount: Number(editAlvo),
          currentAmount: activeGoal.currentAmount,
          deadline: deadlineFormatado || null,
          emoji: editEmoji,
          aiAdvice: activeGoal.aiAdvice
        })
      });

      if (res.ok) {
        showToast("Configurações atualizadas!");
        await carregarDadosIniciais();
        setActiveGoal(null);
      }
    } catch (error) {
      alert("Erro ao salvar alterações.");
    }
  };

  const executarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoal || !selectedAccountId || !amountValue || Number(amountValue) <= 0) return;

    const endpoint = operationType === 'DEPOSIT' ? 'guardar' : 'resgatar';
    
    try {
      const res = await fetch(`http://localhost:8080/api/goals/${activeGoal.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: Number(selectedAccountId),
          amount: Number(amountValue)
        })
      });

      if (res.ok) {
        setAmountValue('');
        showToast(`Operação realizada com sucesso!`);
        await carregarDadosIniciais();
        await carregarHistoricoSonho(activeGoal.id);
        
        const resGoals = await fetch('http://localhost:8080/api/goals');
        if (resGoals.ok) {
          const novosSonhos = await resGoals.json();
          const updated = novosSonhos.find((s: any) => s.id === activeGoal.id);
          if (updated) abrirPainelMeta(updated);
        }
      } else {
        alert("Falha ao processar movimentação. Verifique os saldos.");
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-xl text-gray-900 animate-pulse">CARREGANDO SUAS METAS...</div>;

  return (
    // 🎯 CORREÇÃO DE LAYOUT: padding-left configurado para pl-80 para respeitar a estrutura fixa da Sidebar
    <main className="min-h-screen bg-gray-50 p-8 text-black space-y-8 relative pl-80">
      
      {toast && (
        <div className="fixed top-4 right-4 z-[120] bg-gray-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-4 rounded-2xl shadow-xl border border-white/10">
          <span>✨</span> {toast}
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-gray-100 pb-5">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-all">← Dashboard</Link>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowCriarModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl shadow-md transition-all">+ Adicionar Sonho</button>
            <h1 className="text-2xl font-black tracking-tighter uppercase">🎯 Meus Objetivos</h1>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sonhos.map((sonho: any) => {
            const progressoPct = Math.min(100, ((sonho.currentAmount || 0) / (sonho.targetAmount || 1)) * 100);
            return (
              <div key={sonho.id} onClick={() => abrirPainelMeta(sonho)} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-purple-200 cursor-pointer transition-all flex flex-col justify-between space-y-4 group">
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Meta de Ativo</span>
                    <span className="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">Gerenciar ⚙️</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mt-1">{sonho.emoji || '🎯'} {sonho.name}</h2>
                  {sonho.deadline && <p className="text-[9px] font-black text-red-400 uppercase tracking-wide">Prazo Limite: {sonho.deadline.split('-').reverse().join('/')}</p>}
                  {sonho.aiAdvice && <p className="text-[11px] text-gray-500 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-2 italic">💡 {sonho.aiAdvice}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end text-xs font-bold">
                    <span className="text-gray-400">Guardado: <span className="text-purple-600 font-black">R$ {(sonho.currentAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                    <span className="text-gray-900 font-black">Alvo: R$ {(sonho.targetAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60 shadow-inner">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${progressoPct}%` }} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-right text-gray-400">{progressoPct.toFixed(0)}% Concluído</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: CRIAR NOVO SONHO */}
      {showCriarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-sm p-6 space-y-4 border shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-black uppercase tracking-tight text-center">🚀 Criar Novo Objetivo</h2>
            <div className="space-y-1.5">
              <div className="grid grid-cols-5 gap-1.5 bg-gray-50 p-2.5 rounded-2xl border max-h-24 overflow-y-auto">
                {emojiOptions.map(emoji => (
                  <button key={emoji} type="button" onClick={() => setNovoEmoji(emoji)} className={`text-base p-1 rounded-xl transition-all ${novoEmoji === emoji ? 'bg-white border border-purple-500 shadow-sm scale-115' : 'opacity-40'}`}>{emoji}</button>
                ))}
              </div>
            </div>
            <form onSubmit={handleCriarSonho} className="space-y-3">
              <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome do Objetivo" className="w-full p-3.5 bg-gray-50 border rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-500 text-black" required />
              <input type="number" value={novoAlvo} onChange={e => setNovoAlvo(e.target.value)} placeholder="Valor Alvo (R$)" className="w-full p-3.5 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-purple-500 text-black" required min="1" />
              <input type="text" value={novoDeadline} onChange={e => setNovoDeadline(e.target.value)} placeholder="Prazo Limite (DD/MM/YYYY)" className="w-full p-3.5 bg-gray-50 border rounded-xl font-bold text-xs outline-none focus:border-purple-500 text-black" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCriarModal(false)} className="w-1/2 bg-gray-100 font-black text-xs py-3.5 rounded-xl uppercase">Sair</button>
                <button type="submit" className="w-1/2 bg-purple-600 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider shadow-md">Ativar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINCIPAL: CENTRAL GERAL DO SONHO */}
      {activeGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-xl p-6 flex flex-col max-h-[85vh] border shadow-2xl animate-in zoom-in-95">
            
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Cofre de Investimento</span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">{activeGoal.emoji || '🎯'} {activeGoal.name}</h2>
              </div>
              <button onClick={() => setActiveGoal(null)} className="bg-gray-100 hover:bg-gray-200 text-xs font-black uppercase px-4 py-2 rounded-xl transition-all">Fechar</button>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-500 w-fit mt-4">
              <button type="button" onClick={() => setOperationType('DEPOSIT')} className={`px-4 py-2 rounded-lg transition-all ${operationType === 'DEPOSIT' ? 'bg-white text-black shadow-sm' : ''}`}>📥 Guardar</button>
              <button type="button" onClick={() => setOperationType('WITHDRAW')} className={`px-4 py-2 rounded-lg transition-all ${operationType === 'WITHDRAW' ? 'bg-white text-black shadow-sm' : ''}`}>📤 Resgatar</button>
              <button type="button" onClick={() => setOperationType('EDIT')} className={`px-4 py-2 rounded-lg transition-all ${operationType === 'EDIT' ? 'bg-white text-purple-600 shadow-sm' : ''}`}>✏️ Editar Dados</button>
            </div>

            {(operationType === 'DEPOSIT' || operationType === 'WITHDRAW') && (
              <>
                <form onSubmit={executarMovimentacao} className="py-4 space-y-4 border-b">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full p-3.5 bg-gray-50 border rounded-xl font-bold text-xs uppercase outline-none cursor-pointer" required>
                      {bancos.map((b: any) => <option key={b.id} value={b.id}>🏦 {b.name} (Disp: R$ {b.balance.toLocaleString('pt-BR')})</option>)}
                    </select>
                    <input type="number" placeholder="Valor (R$)" value={amountValue} onChange={e => setAmountValue(e.target.value)} className="w-full p-3.5 bg-gray-50 border rounded-xl font-black text-xs outline-none" min="1" required />
                  </div>
                  <button type="submit" className={`w-full text-xs font-black uppercase py-3.5 rounded-xl text-white shadow-md ${operationType === 'DEPOSIT' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                    {operationType === 'DEPOSIT' ? '✨ Guardar Capital no Cofre' : '⚡ Confirmar Resgate para o Banco'}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto pt-4 space-y-3 pr-1">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📋 Extrato Interno deste Objetivo:</h4>
                  {loadingHistory ? <p className="text-center py-6 text-xs font-bold text-gray-400 animate-pulse">Carregando auditoria...</p> : goalHistoryList.length === 0 ? <p className="text-center py-8 text-xs font-bold text-gray-300 italic">Nenhum aporte registrado ainda.</p> : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {goalHistoryList.map((log: any) => (
                        <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-gray-900 uppercase">{log.type === 'DEPOSITO' ? '📥 Guardado' : '📤 Resgatado'}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">🏛️ {log.bankName} • {new Date(log.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <span className={`text-xs font-black ${log.type === 'DEPOSITO' ? 'text-purple-600' : 'text-blue-500'}`}>{log.type === 'DEPOSITO' ? '+' : '-'} R$ {log.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {operationType === 'EDIT' && (
              <form onSubmit={handleSalvarEdicaoSonho} className="py-4 space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase block text-center">Alterar Ícone</label>
                  <div className="grid grid-cols-5 gap-1.5 bg-gray-50 p-2 rounded-xl border max-h-20 overflow-y-auto">
                    {emojiOptions.map(e => (
                      <button key={e} type="button" onClick={() => setEditEmoji(e)} className={`text-base p-1 rounded-lg transition-all ${editEmoji === e ? 'bg-white border border-purple-500 shadow-sm' : 'opacity-40'}`}>{e}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase block">Nome do Objetivo</label>
                  <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} className="w-full p-3.5 bg-gray-50 border rounded-xl font-bold text-xs uppercase outline-none focus:border-purple-500 text-black" required />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase block">Valor Alvo Necessário (R$)</label>
                  <input type="number" value={editAlvo} onChange={e => setEditAlvo(e.target.value)} className="w-full p-3.5 bg-gray-50 border rounded-xl font-black text-xs outline-none focus:border-purple-500 text-black" required min="1" />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase block">Data Limite / Deadline</label>
                  <input type="text" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} placeholder="YYYY-MM-DD" className="w-full p-3.5 bg-gray-50 border rounded-xl font-bold text-xs outline-none focus:border-purple-500 text-black" />
                </div>

                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase py-3.5 rounded-xl shadow-md tracking-wider">
                  💾 Salvar Modificações no Servidor
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </main>
  );
}