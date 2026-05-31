'use client';

import './globals.css';
import Sidebar from './components/Sidebar';
import { Inter } from 'next/font/google';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState('Matheus');

  useEffect(() => {
    // Busca o nome do usuário para alimentar o perfil da Sidebar
    fetch('http://localhost:8080/api/onboarding/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data && data.name) setUserName(data.name); })
      .catch(() => null);

    const handleUpdateName = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.name) setUserName(customEvent.detail.name);
    };

    window.addEventListener('vmg-onboarding-complete', handleUpdateName);
    return () => window.removeEventListener('vmg-onboarding-complete', handleUpdateName);
  }, []);

  // 🎯 REGRA DE OURO DA SUA IDÉIA: 
  // Se a rota atual for exatamente a página do bot, esconde a Sidebar!
  const isOboardingPage = pathname === '/onboarding';

  return (
    <html lang="pt-br">
      <body className={`${inter.className} antialiased bg-gray-50 text-black`}>
        <div className="flex min-h-screen">
          
          {/* Se NÃO for a página do bot, renderiza a Sidebar */}
          {!isOboardingPage && <Sidebar name={userName} />}
          
          {/* Se NÃO for a página do bot, aplica o pl-64 para empurrar o conteúdo */}
          <div className={`flex-1 w-full transition-all duration-300 ${!isOboardingPage ? 'pl-70' : 'pl-0'}`}>
            {children}
          </div>

        </div>
      </body>
    </html>
  );
}