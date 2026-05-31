'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AjustesPage() {
  const [bancos, setBancos] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingImport, setLoadingImport] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; success: boolean } | null>(null);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAddAccountBox, setShowAddAccountBox] = useState(false);
  const [novoBancoNome, setNovoBancoNome] = useState('');
  const [novoBancoSaldo, setNovoBancoSaldo] = useState('');

  const carregarContasDoServidor = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setBancos(data);
        if (data.length > 0) setSelectedAccountId(data[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { carregarContasDoServidor(); }, []);

  const showToast = (text: string, success = true) => {
    setToastMessage({ text, success });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (!selectedAccountId && bancos.length === 0) {
        alert("🚨 Alerta: Cadastre uma conta corrente antes de arrastar o arquivo de extrato!");
        return;
      }
      setPendingFile(e.dataTransfer.files[0]);
      setShowConfirmModal(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (!selectedAccountId && bancos.length === 0) {
        alert("🚨 Alerta: Cadastre uma conta corrente antes de selecionar o arquivo de extrato!");
        return;
      }
      setPendingFile(e.target.files[0]);
      setShowConfirmModal(true);
    }
  };

  const handleCriarBancoRapidoAjustes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBancoNome || !novoBancoSaldo) return;
    try {
      const res = await fetch('http://localhost:8080/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: novoBancoNome.toUpperCase().trim(), balance: Number(novoBancoSaldo), cards: [] })
      });
      if (res.ok) {
        setNovoBancoNome('');
        setNovoBancoSaldo('');
        setShowAddAccountBox(false);
        await carregarContasDoServidor();
        showToast("Nova conta criada com sucesso!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executarImportacaoAposConfirmar = async () => {
    if (!pendingFile || !selectedAccountId) return;
    setShowConfirmModal(false);
    setLoadingImport(true);

    const formData = new FormData();
    formData.append('file', pendingFile);

    try {
      const res = await fetch(`http://localhost:8080/api/transactions/importar-extrato?accountId=${selectedAccountId}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        showToast("Gastos extraídos e saldo recalculado!");
        await carregarContasDoServidor();
      } else {
        showToast("O padrão de linhas deste PDF não bate com o banco selecionado.", false);
      }
    } catch (error) {
      showToast("Erro de comunicação com o servidor.", false);
    } finally {
      setLoadingImport(false);
      setPendingFile(null);
    }
  };

  return (
    // 🎯 AJUSTE DE LARGURA LATERAL FEITO EM PL-80
    <main className="min-h-screen bg-gray-50 p-8 text-black flex flex-col items-center relative pl-80">
      
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white font-black uppercase text-[10px] tracking-wider px-6 py-4 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2">
          <span>{toastMessage.success ? '✅' : '❌'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="w-full max-w-5xl space-y-8">
        <div className="flex justify-between items-center border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase">⚙️ Ajustes do Sistema</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ferramentas de importação e configurações gerais</p>
          </div>
          <Link href="/" className="text-xs font-black uppercase tracking-widest bg-white border border-gray-200 px-5 py-3 rounded-2xl hover:bg-gray-50 shadow-sm transition-all">
            ← Voltar pro Dash
          </Link>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-purple-600 tracking-wider">📑 Importador Inteligente de Extratos</h3>
              <p className="text-xs font-bold text-gray-400 uppercase">Selecione a conta de destino antes de arrastar o arquivo PDF</p>
            </div>
            
            {bancos.length > 0 ? (
              <div className="space-y-1 w-full max-w-xs">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Direcionar Extrato Para:</label>
                <select className="w-full p-3 bg-gray-50 border rounded-xl font-black text-xs text-black outline-none cursor-pointer uppercase shadow-sm" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                  {bancos.map((b: any) => <option key={b.id} value={b.id}>🏦 {b.name} (Saldo: R$ {b.balance})</option>)}
                </select>
              </div>
            ) : !showAddAccountBox ? (
              <button type="button" onClick={() => setShowAddAccountBox(true)} className="bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-[10px] uppercase tracking-wider px-4 py-3">+ Cadastrar Conta Própria Primeiro</button>
            ) : null}
          </div>

          {showAddAccountBox && (
            <form onSubmit={handleCriarBancoRapidoAjustes} className="p-4 bg-gray-50 rounded-2xl border space-y-3 max-w-sm animate-in fade-in duration-200">
              <p className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Criar Nova Conta para o Extrato</p>
              <input type="text" placeholder="Nome do Banco" className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none text-black uppercase" value={novoBancoNome} onChange={e => setNovoBancoNome(e.target.value)} required />
              <input type="number" placeholder="Saldo Atual" className="w-full p-2.5 bg-white border rounded-xl text-xs font-bold outline-none text-black" value={novoBancoSaldo} onChange={e => setNovoBancoSaldo(e.target.value)} required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddAccountBox(false)} className="text-[10px] font-bold uppercase px-3 py-1 bg-white border rounded-lg">Voltar</button>
                <button type="submit" className="text-[10px] font-black uppercase px-3 py-1 bg-purple-600 text-white rounded-lg">Gravar</button>
              </div>
            </form>
          )}

          {bancos.length > 0 && (
            <label 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`w-full min-h-[230px] rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive ? 'border-purple-600 bg-purple-50/40 shadow-inner' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
              }`}
            >
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={loadingImport} />
              
              <div className="space-y-4">
                <div className="text-5xl">📤</div>
                <div className="space-y-1">
                  <p className="text-sm font-black uppercase tracking-wider text-gray-700">
                    {loadingImport ? '✨ Lendo e processando dados do arquivo...' : `Arraste o Extrato ou clique aqui para enviar para o ${bancos.find(b => String(b.id) === String(selectedAccountId))?.name}`}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Apenas documentos no formato original .PDF são suportados</p>
                </div>
              </div>
            </label>
          )}
        </div>
      </div>

      {showConfirmModal && pendingFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white text-black rounded-[2.5rem] w-full max-w-md p-6 text-center space-y-4 border shadow-2xl">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">📋</div>
            
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase tracking-tight">Confirmar Destino de Lote</h3>
              <p className="text-xs text-gray-400 font-bold uppercase">Mapeamento Contábil de Lançamentos</p>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left space-y-2.5">
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                As despesas encontradas dentro do PDF serão lançadas e deduzidas diretamente do saldo corrente da conta: <strong className="font-black text-purple-600 uppercase">{bancos.find(b => String(b.id) === String(selectedAccountId))?.name}</strong>.
              </p>
              <div className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-[10px] text-amber-800 font-black uppercase">
                ⚠️ Certifique-se de que o arquivo carregado condiz com esta instituição financeira para evitar distorção de saldos.
              </div>
            </div>
            
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowConfirmModal(false); setPendingFile(null); }} className="w-1/3 bg-gray-100 text-gray-700 font-black uppercase text-xs py-3.5 rounded-xl">Cancelar</button>
              <button onClick={executarImportacaoAposConfirmar} className="w-2/3 bg-black text-white font-black uppercase text-xs py-3.5 rounded-xl shadow-md">Confirmar e Importar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}