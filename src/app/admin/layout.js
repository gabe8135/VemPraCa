// d:\Documentos\programação\hotel-portal\src\app\admin\layout.js
'use client'; // Lembrete: este layout precisa ser um Client Component porque usa hooks (usePathname).

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Hook para pegar a rota atual e destacar o link ativo.

export default function AdminLayout({ children }) {
  const pathname = usePathname(); // Guardo o path atual aqui, tipo '/admin/negocios'.

  const navItems = [
    { href: '/admin/negocios', label: 'Estabelecimentos' },
    { href: '/admin/categorias', label: 'Categorias' },
    { href: '/admin/caracteristicas', label: 'Características' },
    // Se eu precisar de mais seções no admin, adiciono os links aqui.
  ];

  return (
    <div className="flex min-h-screen">
      {/* Minha barra lateral de navegação do admin. */}
      <aside className="w-64 bg-green-600 text-white text-white p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-6">Painel Admin</h2>
        <nav className="flex-grow">
          <ul>
            {navItems.map((item) => (
              <li key={item.href} className="mb-2">
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded hover:bg-green-800 transition duration-200 ${
                    // Destaque para o link da página atual.
                    pathname === item.href ? 'bg-green-400 font-semibold' : ''
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Link para o usuário poder voltar ao site principal. */}
        <div className="mt-auto">
            <Link href="/" className="block text-center text-sm text-gray-100 hover:text-white">
                &larr; Voltar ao Site
            </Link>
        </div>
      </aside>
      
      {/* Área principal onde o conteúdo de cada página do admin vai aparecer. */}
      <main className="flex-1 p-6 md:p-10 bg-gray-100 overflow-y-auto">
        {children} {/* O 'children' é o conteúdo específico da rota admin atual. */}
      </main>
    </div>
  );
}
