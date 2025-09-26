// src/app/redefinir-senha/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import Link from 'next/link';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // Mensagem geral (sucesso/validação inicial)
  const [formError, setFormError] = useState(''); // Erro específico do formulário
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false); // Para saber se a verificação inicial terminou
  const [passwordUpdated, setPasswordUpdated] = useState(false); // Para saber se a senha já foi atualizada

  useEffect(() => {
    let isMounted = true;
    setTokenChecked(false); // Inicia a verificação

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        if (session) {
          setIsValidToken(true);
          setMessage('Por favor, defina sua nova senha abaixo.');
        } else {
          setError('Link de redefinição inválido ou expirado. Solicite um novo.');
          setIsValidToken(false);
        }
        setTokenChecked(true);
      }
    };

    checkSession();

    return () => { isMounted = false; };
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setFormError(''); // Limpa erro do formulário
    setLoading(true);

    if (newPassword.length < 6) {
      setFormError('A nova senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setMessage('Senha redefinida com sucesso! Redirecionando para o login...'); // Mensagem final
      setPasswordUpdated(true); // Marca que a senha foi atualizada
      setNewPassword('');
      setConfirmPassword('');
      setError(''); // Limpa qualquer erro anterior
      setFormError('');

      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err) {
      console.error("Erro ao atualizar senha:", err);
      setFormError(err.message || 'Ocorreu um erro ao tentar redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  // Renderiza um estado de carregamento enquanto verifica o token
  if (!tokenChecked) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4">
        <p className="text-emerald-700/80 animate-pulse">Verificando link...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="w-full max-w-md space-y-6 bg-white/90 backdrop-blur-sm p-10 rounded-[2rem] shadow-lg border border-emerald-100/70">
        <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
          Redefinir Senha
        </h2>

        {/* Mensagem de validação inicial ou sucesso final */}
        {message && (
          <p className={`text-sm text-center font-medium ${passwordUpdated ? 'text-emerald-600' : 'text-emerald-700'} bg-emerald-50 border border-emerald-100 rounded-lg py-2 px-3`}>
            {message}
          </p>
        )}

        {/* Erro geral (token inválido/expirado) */}
        {error && <p className="text-red-600 text-sm text-center font-medium bg-red-50 border border-red-100 rounded-lg py-2 px-3">{error}</p>}

        {/* Mostra o formulário se o token for válido E a senha ainda não foi atualizada */}
        {isValidToken && !passwordUpdated && (
          <form onSubmit={handlePasswordUpdate} className="space-y-5 mt-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-emerald-900/80">
                Nova Senha
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength="6"
                className="mt-1 block w-full px-4 py-3 border border-emerald-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-black bg-white/70 transition"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-emerald-900/80">
                Confirmar Nova Senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength="6"
                className="mt-1 block w-full px-4 py-3 border border-emerald-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-black bg-white/70 transition"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Exibição de Erro do Formulário */}
            {formError && <p className="text-red-600 text-sm text-center font-medium bg-red-50 border border-red-100 rounded-lg py-2 px-3">{formError}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-md text-sm font-semibold tracking-wide text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/30 disabled:opacity-50 transition group"
              >
                <span className="relative z-10">{loading ? 'Salvando...' : 'Salvar Nova Senha'}</span>
                <span className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-white/20 to-teal-500/0 opacity-0 group-hover:opacity-100 translate-x-[-40%] group-hover:translate-x-[40%] transition-all duration-700" />
              </button>
            </div>
          </form>
        )}

        {/* Link para Login (mostra se deu erro no token ou após sucesso) */}
        {(error || passwordUpdated) && (
          <p className="text-center text-sm text-emerald-700/80 mt-4">
            <Link href="/login" className="font-semibold text-emerald-700 hover:text-teal-600 focus:outline-none transition">
              Voltar para o Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// Função para solicitar redefinição de senha (pode ser chamada em outro lugar, como uma página de login)
export async function solicitarRedefinicaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.vempracaapp.com/redefinir-senha'
  });

  if (error) {
    throw error;
  }

  return true;
}
