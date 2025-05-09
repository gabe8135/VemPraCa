// src/app/esqueci-senha/page.js
'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient'; // Ajuste o caminho se necessário
import Link from 'next/link';

export default function EsqueciSenhaPage() {
const [email, setEmail] = useState('');
  const [message, setMessage] = useState(''); // Para mensagens de sucesso
  const [error, setError] = useState('');     // Para mensagens de erro
const [loading, setLoading] = useState(false);

const handlePasswordResetRequest = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    // --- URL para onde o usuário será redirecionado APÓS clicar no link do email ---
    //    Certificar de que esta rota exista ou tem que criar ela (ex: /redefinir-senha)
    const redirectUrl = `${window.location.origin}/redefinir-senha`;
    // -----------------------------------------------------------------------------

    try {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
    });

    if (resetError) {
        throw resetError;
    }

    setMessage('Email de redefinição de senha enviado! Verifique sua caixa de entrada (e spam).');
      setEmail(''); // Limpa o campo após sucesso

    } catch (err) {
    console.error("Erro ao solicitar redefinição de senha:", err);
    setError(err.message || 'Ocorreu um erro ao tentar enviar o email. Verifique o email digitado ou tente novamente.');
    } finally {
    setLoading(false);
    }
};

return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8 py-12 bg-gray-50">
    <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">
        Esqueceu sua Senha?
        </h2>
        <p className="text-center text-sm text-gray-600">
        Digite seu email abaixo e enviaremos um link para você redefinir sua senha.
        </p>

        <form onSubmit={handlePasswordResetRequest} className="space-y-4">
        <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Cadastrado
            </label>
            <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            disabled={loading}
            />
        </div>

          {/* Mensagens de Sucesso e Erro */}
        {message && <p className="text-green-600 text-sm text-center font-medium">{message}</p>}
        {error && <p className="text-red-600 text-sm text-center font-medium">{error}</p>}

        <div>
            <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
            {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </button>
        </div>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
        Lembrou a senha?{' '}
        <Link href="/login" className="font-medium text-green-600 hover:text-green-500">
            Voltar para o Login
        </Link>
        </p>
    </div>
    </div>
);
}
