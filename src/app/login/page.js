'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa'; // Ícones adicionados pra mostrar/ocultar senha

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Meu estado pra controlar visibilidade da senha
  const [nome, setNome] = useState(''); // Novo estado para o nome

  // Se já estou logado, redireciona pra home
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Só redireciona se NÃO estiver na página de redefinição de senha
      if (session && typeof window !== 'undefined') {
        if (!window.location.pathname.startsWith('/redefinir-senha')) {
          router.push('/');
        }
      }
    };
    checkUser();
  }, [router]);

  // Alterna exibição da senha
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  // Autenticação (login ou cadastro)
  const handleAuth = async () => {
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Cadastro
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          setLoading(false);
          return;
        }
        if (!nome.trim()) {
          setError('O nome é obrigatório.');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        // Atualiza o nome_proprietario e email na tabela profiles
        if (data?.user?.id) {
          await supabase
            .from('profiles')
            .update({ nome_proprietario: nome, email: email })
            .eq('id', data.user.id);
        }

        alert('Cadastro realizado! Verifique seu email para confirmar.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setNome('');
      } else {
        // Login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Email ou senha inválidos.');
          } else {
            throw signInError;
          }
        } else {
          router.push('/');
        }
      }
    } catch (err) {
      console.error("Erro na autenticação:", err);
      if (!error) {
        setError(err.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (googleError) {
      console.error('Erro no login com Google:', googleError.message);
      setError('Falha ao tentar login com Google. Tente novamente.');
      setLoading(false);
    }
  };

  // Alterna entre login e cadastro
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
  };

  // Função para recuperação de senha
  const handlePasswordReset = async () => {
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email inválido.');
      setLoading(false);
      return;
    }

    try {
      // Chama a função de redefinição de senha do Supabase
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://www.vempracaapp.com/redefinir-senha'
      });

      alert('Verifique seu email para redefinir a senha.');
    } catch (err) {
      console.error("Erro na recuperação de senha:", err);
      setError('Ocorreu um erro ao tentar redefinir a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 items-center justify-center min-h-[calc(100vh-200px)] mt-20 px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          {isSignUp ? 'Criar sua Conta' : 'Acessar sua Conta'}
        </h2>

        <div className="space-y-4">
          {/* Campo de email padrão */}
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          {/* Campo de senha com botão para exibir/ocultar */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'} // Aqui troco a visibilidade da senha
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                minLength="6"
                className="mt-1 block w-full pr-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {/* Botão de visibilidade da senha */}
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute top-2.5 right-3 text-gray-500 hover:text-gray-800 focus:outline-none"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Link "Esqueci minha senha?" AGORA aparece abaixo do campo */}
            {!isSignUp && (
              <div className="text-right mt-1">
                <Link
                  href="/esqueci-senha"
                  className="text-sm font-medium text-blue-700 hover:text-green-500"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            )}
          </div>

          {/* Campo de confirmação de senha (apenas no cadastro) */}
          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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

          {/* Campo de nome (apenas no cadastro) */}
          {isSignUp && (
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && <p className="text-red-600 text-sm text-center font-medium">{error}</p>}

        {/* Botão principal de login/cadastro */}
        <div>
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
          </button>
        </div>

        {/* Divisor "OU" (apenas no login) */}
        {!isSignUp && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OU</span>
            </div>
          </div>
        )}

        {/* Botão de login com Google (apenas no login) */}
        {!isSignUp && (
          <div>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <FaGoogle className="text-red-500 text-lg" />
              Entrar com Google
            </button>
          </div>
        )}

        {/* Alternador entre login/cadastro */}
        <p className="text-center text-sm text-gray-600 mt-6">
          {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
          <button
            onClick={toggleAuthMode}
            className="font-medium text-blue-700 hover:text-green-500 focus:outline-none"
          >
            {isSignUp ? 'Faça login' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}