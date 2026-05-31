'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  name: string;
}

export default function Sidebar({ name }: SidebarProps) {
  const pathname = usePathname();

  const [showTrimestralModal, setShowTrimestralModal] = useState(false);
  const [textoConsultoria, setTextoConsultoria] = useState('');
  const [loadingConsultoria, setLoadingConsultoria] = useState(false);

  const buscarConsultoriaIA = async () => {
    setShowTrimestralModal(true);
    setLoadingConsultoria(true);
    try {
      const res = await fetch('http://localhost:8080/api/ia/resumo-trimestral');
      if (res.ok) {
        const data = await res.json();
        setTextoConsultoria(data.analise || data.analysis);
      } else {
        setTextoConsultoria("Ainda não temos dados históricos de movimentações suficientes nos últimos 3 meses para gerar um relatório de feedback preciso.");
      }
    } catch (error) {
      setTextoConsultoria("Erro de conexão ao tentar se comunicar com o barramento do Gemini Service.");
    } finally {
      setLoadingConsultoria(false);
    }
  };

  const inicialDoNome = name ? name.trim().charAt(0).toUpperCase() : 'M';
  const primeiroNome = name ? name.split(' ')[0] : 'Matheus';

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Nova Mágica', href: '/magic', icon: '✨' },
    { name: 'Bancos', href: '/bancos', icon: '🏦' },
    { name: 'Meus Sonhos', href: '/sonhos', icon: '🎯' },
    { name: 'Ajustes', href: '/ajustes', icon: '⚙️' },
  ];

  return (
    <>
      {/* 🎯 AJUSTE DE LARGURA FIXA E COMPATIBILIDADE: Configurado w-72 estável para cobrir o grid utilitário */}
      <aside className="w-72 bg-white h-screen border-r border-gray-100 p-6 flex flex-col justify-between fixed left-0 top-0 text-black z-40">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="px-2">
            <h2 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              VMG WALLET
            </h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Smart Finance v2.0
            </p>
          </div>

          {/* Links de Navegação */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <button
              onClick={buscarConsultoriaIA}
              className="w-full mt-2 flex items-center gap-3 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-purple-600 bg-purple-50/50 hover:bg-purple-100 border border-purple-100/60 transition-all active:scale-95 text-left"
            >
              <span className="text-base">💡</span>
              <span>Análise 90 Dias</span>
            </button>
          </nav>
        </div>

        {/* Profile Footer */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 text-xs">
              {inicialDoNome}
            </div>
            <div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-tight truncate max-w-[130px]">
                {primeiroNome}
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Filiado ao VMG</p>
            </div>
          </div>

          <button 
            onClick={() => alert('Sessão encerrada com segurança no VMG Wallet!')}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-xs uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all active:scale-95"
          >
            <span>🚪</span> Sair do App
          </button>
        </div>
      </aside>

      {/* MODAL DA CONSULTORIA */}
      {showTrimestralModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-2xl p-8 flex flex-col max-h-[85vh] border shadow-2xl animate-in zoom-in-95">
            
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-lg shadow-inner">💡</div>
                <div>
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider block leading-none mb-1">Feedback de Administration</span>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-none">Consultoria Estratégica Trimestral</h2>
                </div>
              </div>
              <button 
                onClick={() => setShowTrimestralModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-xs font-black uppercase px-4 py-2 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 pr-1 space-y-4 text-sm text-gray-700 leading-relaxed font-semibold whitespace-pre-line">
              {loadingConsultoria ? (
                <div className="text-center py-24 space-y-3">
                  <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">O Gemini está minerando seus hábitos de consumo dos últimos 3 meses...</p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-3xl p-6 text-xs font-bold text-gray-800 border leading-relaxed shadow-inner">
                  {textoConsultoria}
                </div>
              )}
            </div>

            <div className="border-t pt-4 text-center">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest select-none">
                🛡️ VMG Smart Analytics — Relatório gerencial baseado em faturamentos e receitas históricas.
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
}