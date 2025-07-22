// src/app/components/Header.js
'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react'; 
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Para eu saber se o usuário logado é admin.
  const [loadingAuth, setLoadingAuth] = useState(true); // Para mostrar um feedback enquanto verifico a autenticação.
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Controla o menu mobile.
  const menuRef = useRef(null); // Referência para o conteúdo do menu (nav)
  const menuButtonRef = useRef(null); // Criar uma referência para o BOTÃO do menu

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

  // Efeito para fechar o menu ao clicar fora (apenas em mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen &&
        menuRef.current && // Garante que o menu (nav) existe
        !menuRef.current.contains(event.target) && // Clique foi FORA do conteúdo do menu
        menuButtonRef.current && // Garante que o botão do menu existe
        !menuButtonRef.current.contains(event.target) // E o clique também foi FORA do botão do menu
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]); // Dependência: isMenuOpen, para adicionar/remover o listener conforme necessário
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
    <header className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-sm w-[95%] z-50 max-w-5xl mx-auto mt-2 mb-30 pt-0">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8 w-full" aria-label="Global">
        {/* Logo */}
        <div className="flex flex-1">
          <Link href="/" onClick={handleLinkClick} className="-m-1.5 p-1.5">
            <img
              className="h-10 w-auto"
              src="https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site//VemPraCa.webp"
              alt="Vem Pra Cá"
            />
          </Link>
        </div>
        {/* Botão sanduíche mobile */}
        <div className="flex lg:hidden">
          <button
            onClick={toggleMenu}
            aria-label="Abrir menu"
            ref={menuButtonRef}
            className="inline-flex items-center justify-center rounded-md p-2.5 text-white hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
        {/* Menu desktop */}
        <div className="hidden lg:flex flex-1 justify-center gap-x-8">
          <Link href="/" className="text-base font-semibold text-white hover:text-[#F0B100] px-4 py-1 rounded-full w-auto transition whitespace-nowrap" onClick={handleLinkClick}>Início</Link>
          <Link href="/sobre" className="text-base font-semibold text-white hover:text-[#F0B100] px-4 py-1 rounded-full w-auto transition whitespace-nowrap" onClick={handleLinkClick}>Sobre</Link>
          <Link href="/contato" className="text-base font-semibold text-white hover:text-[#F0B100] px-4 py-1 rounded-full w-auto transition whitespace-nowrap" onClick={handleLinkClick}>Contato</Link>
          {session && (
            <Link href="/meus-negocios" className="text-base font-semibold text-white hover:text-[#F0B100] px-4 py-1 rounded-full w-auto transition whitespace-nowrap" onClick={handleLinkClick}>Meus Negócios</Link>
          )}
          {!loadingAuth && session && isAdmin && (
            <Link href="/admin/negocios" className="text-base font-semibold bg-gradient-to-r from-yellow-300 to-amber-400 text-green-800 hover:bg-yellow-400 px-4 py-1 rounded-full w-auto transition whitespace-nowrap" onClick={handleLinkClick}>Painel Admin</Link>
          )}
        </div>
        {/* Botão login à direita no desktop */}
        <div className="hidden lg:flex flex-1 justify-end">
          {loadingAuth ? (
            <span className="text-white text-base px-4 py-1 whitespace-nowrap">Verificando...</span>
          ) : session ? (
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-400 text-white px-4 py-1 rounded-full font-semibold w-auto transition whitespace-nowrap">Sair</button>
          ) : (
            <Link href="/login" className="bg-white hover:bg-[#F0B100] text-green-800 px-4 py-1 rounded-full font-semibold w-auto transition whitespace-nowrap" onClick={handleLinkClick}>Login</Link>
          )}
        </div>
      </nav>
      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={toggleMenu}></div>
      )}
      <nav
        className={`lg:hidden fixed top-0 right-0 z-50 h-full bg-gradient-to-r from-green-600 to-emerald-700 shadow-lg transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ maxWidth: '20rem', width: '100vw' }}
        ref={menuRef}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <Link href="/" onClick={handleLinkClick} className="-m-1.5 p-1.5">
            <img
              className="h-10 w-auto"
              src="https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site//VemPraCa.webp"
              alt="Vem Pra Cá"
            />
          </Link>
          <button
            onClick={toggleMenu}
            aria-label="Fechar menu"
            className="rounded-md p-2.5 text-white hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="flex flex-col gap-2 p-6 items-center">
          <li>
            <Link href="/" className="block w-full text-center text-lg font-semibold text-white hover:text-[#F0B100] px-4 py-2 rounded-lg transition whitespace-nowrap" onClick={handleLinkClick}>Início</Link>
          </li>
          <li>
            <Link href="/sobre" className="block w-full text-center text-lg font-semibold text-white hover:text-[#F0B100] px-4 py-2 rounded-lg transition whitespace-nowrap" onClick={handleLinkClick}>Sobre</Link>
          </li>
          <li>
            <Link href="/contato" className="block w-full text-center text-lg font-semibold text-white hover:text-[#F0B100] px-4 py-2 rounded-lg transition whitespace-nowrap" onClick={handleLinkClick}>Contato</Link>
          </li>
          {session && (
            <li>
              <Link href="/meus-negocios" className="block w-full text-center text-lg font-semibold text-white hover:text-[#F0B100] px-4 py-2 rounded-lg transition whitespace-nowrap" onClick={handleLinkClick}>Meus Negócios</Link>
            </li>
          )}
          {!loadingAuth && session && isAdmin && (
            <li>
              <Link
                href="/admin/negocios"
                className="block w-full text-center text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg transition whitespace-nowrap"
                onClick={handleLinkClick}
              >
                Painel Admin
              </Link>
            </li>
          )}
          {loadingAuth ? (
            <li><span className="text-white text-lg px-4 py-2 text-center whitespace-nowrap">Verificando...</span></li>
          ) : session ? (
            <li>
              <button onClick={handleLogout} className="block w-full text-center text-lg font-semibold bg-red-700 text-white px-4 py-2 rounded-lg transition whitespace-nowrap">Sair</button>
            </li>
          ) : (
            <li>
              <Link href="/login" className="block w-full text-center text-lg font-semibold bg-white hover:bg-[#F0B100] text-green-800 px-4 py-2 rounded-lg transition whitespace-nowrap" onClick={handleLinkClick}>Login</Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
