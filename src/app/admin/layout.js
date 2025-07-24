// d:\Documentos\programação\hotel-portal\src\app\admin\layout.js
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { href: '/admin/negocios', label: 'Estabelecimentos' },
    { href: '/admin/gerenciar-negocios', label: 'Gerenciar Negócios' },
    { href: '/admin/cadastrar-negocio', label: 'Cadastrar Negócio' },
    { href: '/admin/categorias', label: 'Categorias' },
    { href: '/admin/caracteristicas', label: 'Características' },
  ];

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="flex min-h-screen mt-25 overflow-x-hidden">
      {/* Botão do Menu Sanduíche */}
      <button
        onClick={toggleMenu}
        className="fixed top-28 right-4 z-50 md:hidden bg-green-600 text-white p-3 rounded-lg shadow-lg hover:bg-green-700 transition-colors"
        aria-label="Abrir menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay com efeito vidro desfocado */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden backdrop-blur-sm bg-white/30"
          onClick={closeMenu}
        />
      )}

      {/* Menu Lateral com borda arredondada superior direita */}
      <aside className={`
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:static
        w-64 bg-green-600 text-white p-4 flex flex-col
        transition-transform duration-300 ease-in-out
        z-40 
        h-screen md:min-h-full
        top-0 md:top-auto
        rounded-tr-3xl
      `}>
        {/* Espaçamento para o header em mobile */}
        <div className="h-25 md:h-0 flex-shrink-0"></div>
        
        <h2 className="text-xl font-semibold mb-6">Painel Admin</h2>
        <nav className="flex-grow">
          <ul>
            {navItems.map((item) => (
              <li key={item.href} className="mb-2">
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded hover:bg-green-800 transition duration-200 ${
                    pathname === item.href ? 'bg-green-400 font-semibold' : ''
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pb-4">
          <Link 
            href="/" 
            onClick={closeMenu}
            className="block text-center text-sm text-gray-100 hover:text-white"
          >
            &larr; Voltar ao Site
          </Link>
        </div>
      </aside>
      
      {/* Área principal */}
      <main className="flex-1 bg-gray-100 overflow-x-hidden overflow-y-auto w-0 md:w-auto">
        <div className="p-2 md:p-4 max-w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
