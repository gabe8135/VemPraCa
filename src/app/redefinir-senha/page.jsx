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
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <p className="text-gray-600">Verificando link...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8 py-12 bg-gray-50">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Redefinir Senha
        </h2>

        {/* Mensagem de validação inicial ou sucesso final */}
        {message && <p className={`text-sm text-center font-medium ${passwordUpdated ? 'text-green-600' : 'text-green-700'}`}>{message}</p>}

        {/* Erro geral (token inválido/expirado) */}
        {error && <p className="text-red-600 text-sm text-center font-medium">{error}</p>}

        {/* Mostra o formulário se o token for válido E a senha ainda não foi atualizada */}
        {isValidToken && !passwordUpdated && (
          <form onSubmit={handlePasswordUpdate} className="space-y-4 mt-4">
            <div>
              <label htmlFor="newPassword"className="block text-sm font-medium text-gray-700">
                Nova Senha
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength="6"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700">
                Confirmar Nova Senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength="6"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-black"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Exibição de Erro do Formulário */}
            {formError && <p className="text-red-600 text-sm text-center font-medium">{formError}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </button>
            </div>
          </form>
        )}

        {/* Link para Login (mostra se deu erro no token ou após sucesso) */}
        {(error || passwordUpdated) && (
            <p className="text-center text-sm text-gray-600 mt-4">
              <Link href="/login" className="font-medium text-green-700 hover:text-green-500">
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
