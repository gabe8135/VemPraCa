// src/app/components/Header.js
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Para eu saber se o usuário logado é admin.
  const [loadingAuth, setLoadingAuth] = useState(true); // Para mostrar um feedback enquanto verifico a autenticação.
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Controla o menu mobile.

  // Função para verificar se o usuário tem a role 'admin'.
  const checkUserRole = async (userId) => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from('profiles') // Minha tabela de perfis.
        .select('role')
        .eq('id', userId)
        .single();
      // Se o perfil não for encontrado (PGRST116), não é um erro fatal, só não é admin.
      if (error && error.code !== 'PGRST116') {
        throw error; // Outros erros eu lanço.
      }
      return data?.role === 'admin';
    } catch (err) {
      console.error("Erro ao verificar role do usuário no Header:", err);
      return false; // Em caso de erro, assumo que não é admin.
    }
  };

  useEffect(() => {
    let isMounted = true; // Flag para evitar setar estado se o componente desmontar.
    setLoadingAuth(true);

    const handleAuthChange = async (event, session) => {
      if (!isMounted) return;

      console.log(`Evento de autenticação: ${event}`, session);
      setSession(session); // Atualizo a sessão.

      if (session?.user) {
        // Se tem sessão, verifico a role.
        const isAdminUser = await checkUserRole(session.user.id);
        if (isMounted) {
          setIsAdmin(isAdminUser);
          console.log("Usuário é admin:", isAdminUser);
        }
      } else {
        // Sem sessão, não é admin.
        if (isMounted) setIsAdmin(false);
      }
      if (isMounted) setLoadingAuth(false); // Finalizo o loading depois de tudo.
    };

    // Pego a sessão inicial e verifico a role.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleAuthChange('INITIAL_SESSION', initialSession); // Chamo minha função para tratar a sessão inicial.
    });

    // Escuto as mudanças na autenticação (login/logout).
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (isMounted) setLoadingAuth(true); // Mostro loading ao detectar mudança.
        handleAuthChange(event, currentSession); // Chamo minha função para tratar a mudança.
      }
    );

    // Limpeza quando o componente desmonta.
    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
      console.log("Listener de autenticação do Header desinscrito.");
    };
  }, []); // Roda só uma vez na montagem.

  const handleLogout = async () => {
    setIsMenuOpen(false); // Fecho o menu mobile antes.
    setLoadingAuth(true); // Mostro loading durante o logout.
    await supabase.auth.signOut();
    // O listener onAuthStateChange vai cuidar de atualizar session, isAdmin e loadingAuth.
    router.push('/'); // Redireciono para a home.
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fecho o menu mobile quando um link é clicado.
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 relative">
      <div className="container mx-auto flex justify-between items-center">

        {/* Meu Logo */}
        <Link href="/" onClick={handleLinkClick}>
            <img
              className="w-[30vw] md:w-[15vw] lg:w-[10vw] h-auto"
              src="https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site//LETREIRO.png"
              alt="Vem Pra Cá 🡵"
            />
        </Link>

        {/* Botão Sanduíche para mobile */}
        <div className="md:hidden">
          <button onClick={toggleMenu} aria-label="Abrir menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className={`
          md:flex md:items-center md:space-x-4
          ${isMenuOpen ? 'block' : 'hidden'}
          absolute md:relative
          top-full left-0 w-full md:w-auto
          bg-green-950 md:bg-transparent  // Fundo escuro no mobile para contraste.
          p-4 md:p-0
          z-20 // Para o menu mobile ficar sobre outros elementos.
        `}>
          <ul className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 items-start md:items-center">
            <li>
              <Link href="/" className="hover:bg-green-600 px-4 rounded block py-1 transition duration-250" onClick={handleLinkClick}>
                Início
              </Link>
            </li>
            <li>
              <Link href="/sobre" className="hover:bg-green-600 px-4 rounded block py-1 transition duration-250" onClick={handleLinkClick}>
                Sobre
              </Link>
            </li>
            <li>
              <Link href="/contato" className="hover:bg-green-600 px-4 rounded block py-1 transition duration-250" onClick={handleLinkClick}>
                Contato
              </Link>
            </li>
            {/* Link "Meu Negócio" só aparece se o usuário estiver logado. */}
            {session && (
              <li>
                <Link href="/meu-negocio" className="hover:bg-green-600 px-4 rounded block py-1 transition duration-250" onClick={handleLinkClick}>
                  Meu Negocio
                </Link>
              </li>
            )}

            {/* Link do Painel Admin: só se estiver logado E for admin. */}
            {!loadingAuth && session && isAdmin && (
              <li>
                <Link href="/admin/negocios" className="bg-yellow-500 hover:bg-yellow-400 px-4 rounded transition duration-250 block py-1" onClick={handleLinkClick}>
                  Painel Admin
                </Link>
              </li>
            )}

            {/* Lógica de Login/Logout */}
            {loadingAuth ? (
              <li><span className="text-gray-400 text-sm px-4 py-1">Verificando...</span></li>
            ) : session ? (
              <li>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded transition duration-250 w-full md:w-auto text-left md:text-center"
                >
                  Sair
                </button>
              </li>
            ) : (
              <li>
                <Link
                  href="/login"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded transition duration-250 block w-full md:w-auto text-center"
                  onClick={handleLinkClick}
                >
                  Login
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
