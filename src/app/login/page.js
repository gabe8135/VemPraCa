// src/app/login/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Preciso do Link do Next.js para navegação.
import { supabase } from '@/app/lib/supabaseClient';
import { FaGoogle } from 'react-icons/fa';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Meu estado para confirmar a senha no cadastro.
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Para controlar o estado de loading do botão.

  // Se eu já estiver logado, me redireciona para a home.
  useEffect(() => {
    const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        router.push('/'); // Redireciono para a home se já existir uma sessão.
    }
    };
    checkUser();
  }, [router]);

  const handleAuth = async () => {
    setError(''); // Limpo qualquer erro anterior.
    setLoading(true); // Ativo o loading.

    // Validação básica do formato do email.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
    setError('Email inválido.');
    setLoading(false);
    return;
    }

    // Senha precisa ter no mínimo 6 caracteres.
    if (password.length < 6) {
    setError('A senha deve ter pelo menos 6 caracteres.');
    setLoading(false);
    return;
    }

    try {
    if (isSignUp) {
        // --- Minha lógica de Cadastro ---

        // Verifico se as senhas digitadas são iguais.
        if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
          return; // Paro aqui se as senhas não baterem.
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
          // Lembrete: Se eu quiser confirmação de email, descomento essa linha.
          // options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        });

        if (signUpError) {
          throw signUpError; // Jogo o erro para o bloco catch.
        }
        alert('Cadastro realizado! Verifique seu email para confirmar (se a opção de confirmação estiver ativa).');
        setIsSignUp(false); // Mudo para a tela de login depois do cadastro.
        // Limpo os campos para o próximo uso.
        setEmail('');
        setPassword('');
        setConfirmPassword('');

    } else {
        // --- Minha lógica de Login ---
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
        });

        if (signInError) {
          // Trato o erro específico de credenciais inválidas.
        if (signInError.message.includes('Invalid login credentials')) {
            setError('Email ou senha inválidos.');
        } else {
             throw signInError; // Outros erros vão para o catch.
        }
        } else {
           router.push('/'); // Login bem-sucedido, vou para a home.
        }
    }
    } catch (err) {
    console.error("Erro na autenticação:", err);
      // Mostro uma mensagem de erro genérica ou a mensagem do erro, se ainda não foi definida.
      if (!error) { // Só defino o erro se ele ainda não foi setado (ex: "As senhas não coincidem").
        setError(err.message || 'Ocorreu um erro. Tente novamente.');
    }
    } finally {
      setLoading(false); // Desativo o loading, não importa o resultado.
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true); // Ativo o loading para o login com Google.
    const { error: googleError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
        redirectTo: window.location.origin // Após o login com Google, volto para a home.
    }
    });
    if (googleError) {
    console.error('Erro no login com Google:', googleError.message);
    setError('Falha ao tentar login com Google. Tente novamente.');
    setLoading(false);
    }
    // Se o login com Google funcionar, o redirecionamento acontece.
    // O setLoading(false) aqui pode não ser executado se o redirecionamento for imediato.
  };

  // Função para alternar entre os modos de Login e Cadastro.
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError(''); // Limpo os erros ao trocar de modo.
    // Lembrete: Limpar os campos de email/senha ao trocar de modo é opcional, mas pode ser bom para UX.
    // setEmail('');
    // setPassword('');
    // setConfirmPassword('');
  };


  return (
    // Container principal da página de login/cadastro.
    <div className="flex flex-col bg-gray-50 items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8 py-12">
      {/* Card do formulário. */}
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
        {isSignUp ? 'Criar sua Conta' : 'Acessar sua Conta'}
        </h2>

        {/* Agrupamento dos campos de input. */}
        <div className="space-y-4">
        <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
            </label>
            <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black" // Garanto que o texto do input seja preto.
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            />
        </div>

        <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700">
            Senha
            </label>
            <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength="6"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            />
        </div>

          {/* Campo para Confirmar Senha, só aparece no modo de Cadastro. */}
        {isSignUp && (
            <div>
            <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700">
                Confirmar Senha
            </label>
            <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength="6"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
            />
            </div>
        )}
        </div>

        {/* Área para exibir mensagens de erro. */}
        {error && <p className="text-red-600 text-sm text-center font-medium">{error}</p>}

        {/* Link "Esqueci Minha Senha", só aparece no modo de Login. */}
        {!isSignUp && (
        <div className="text-sm text-right">
            <Link href="/esqueci-senha" // Link para minha página de redefinição de senha.
                className="font-medium text-blue-700 hover:text-green-500">
            Esqueceu sua senha?
            </Link>
        </div>
        )}

        {/* Meu botão principal para Login ou Cadastro. */}
        <div>
        <button
            onClick={handleAuth}
            disabled={loading} // Desabilito o botão enquanto estiver carregando.
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
            {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
        </button>
        </div>

        {/* Divisor "OU", só aparece no modo de Login. */}
        {!isSignUp && (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OU</span> {/* O bg-white aqui é para combinar com o fundo do card. */}
            </div>
        </div>
        )}

        {/* Botão para Login com Google, só aparece no modo de Login. */}
        {!isSignUp && (
        <div>
            <button
            onClick={handleGoogleLogin}
              disabled={loading} // Posso desabilitar este também durante o loading.
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <FaGoogle className="text-red-500 text-lg" /> {/* Ícone do Google. */}
            Entrar com Google
            </button>
        </div>
        )}

        {/* Texto e botão para alternar entre Login e Cadastro. */}
        <p className="text-center text-sm text-gray-600 mt-6">
        {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
        <button
            onClick={toggleAuthMode} // Chamo minha função para trocar o modo e limpar erros.
            className="font-medium text-blue-700 hover:text-green-500 focus:outline-none"
        >
            {isSignUp ? 'Faça login' : 'Cadastre-se'}
        </button>
        </p>
    </div>
    </div>
  );
}
