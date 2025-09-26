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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-br from-emerald-50 via-white to-teal-50 mt-20">
        <div className="w-full max-w-md space-y-6 bg-white/90 backdrop-blur-sm p-10 rounded-[2rem] shadow-lg border border-emerald-100/70">
            <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                Esqueceu sua Senha?
            </h2>
            <p className="text-center text-sm text-emerald-800/80">
                Digite seu email abaixo e enviaremos um link para você redefinir sua senha.
            </p>

            <form onSubmit={handlePasswordResetRequest} className="space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-emerald-900/80">
                        Email Cadastrado
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="mt-1 block w-full px-4 py-3 border border-emerald-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-400 sm:text-sm text-black bg-white/70 transition"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        disabled={loading}
                    />
                </div>

                {/* Mensagens de Sucesso e Erro */}
                {message && <p className="text-emerald-600 text-sm text-center font-medium bg-emerald-50 border border-emerald-100 rounded-lg py-2 px-3">{message}</p>}
                {error && <p className="text-red-600 text-sm text-center font-medium bg-red-50 border border-red-100 rounded-lg py-2 px-3">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative overflow-hidden flex justify-center py-3 px-4 border border-transparent rounded-2xl shadow-md text-sm font-semibold tracking-wide text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/30 disabled:opacity-50 transition group"
                    >
                        <span className="relative z-10">{loading ? 'Enviando...' : 'Enviar Link de Redefinição'}</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-white/20 to-teal-500/0 opacity-0 group-hover:opacity-100 translate-x-[-40%] group-hover:translate-x-[40%] transition-all duration-700" />
                    </button>
                </div>
            </form>

            <p className="text-center text-sm text-emerald-700/80 mt-4">
                Lembrou a senha?{' '}
                <Link href="/login" className="font-semibold text-emerald-700 hover:text-teal-600 focus:outline-none transition">
                    Voltar para o Login
                </Link>
            </p>
        </div>
    </div>
);
}
