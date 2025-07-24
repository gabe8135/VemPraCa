// src/app/contato/page.js
'use client';

import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';

export default function Contato() {
const [showModal, setShowModal] = useState(false); // Para controlar a visibilidade do meu modal de sucesso.

async function handleSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    // Envio os dados do formulário para o Formspree.
    const response = await fetch('https://formspree.io/f/mzzeoedb', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: data,
    });

    // Se o envio for bem-sucedido, limpo o formulário e mostro o modal.
    if (response.ok) {
    form.reset();
    setShowModal(true);
    }
}

return (
    <div className="min-h-screen px-[5vw] md:px-[15vw] lg:px-[15vw] py-12 bg-gray-50 rounded-2xl flex flex-col mt-20 items-center">
    <h1 className="text-4xl font-bold text-center text-green-800 mb-4">
        Fale com a gente
    </h1>

    <p className="text-center text-gray-600 max-w-2xl mb-10">
        Quer cadastrar seu negócio? Tem alguma dúvida, sugestão ou só quer bater um papo?
        Fale com a gente! É só preencher o formulário abaixo ou mandar uma mensagem direto no meu WhatsApp.
    </p>

    <form onSubmit={handleSubmit} className="w-full max-w-xl bg-white rounded-2xl shadow-md p-8 space-y-6">
        <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
            Nome
        </label>
        <input
            id="nome"
            name="nome"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Seu nome"
        />
        </div>

        <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-mail
        </label>
        <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="seuemail@exemplo.com"
        />
        </div>

        <div>
        <label htmlFor="mensagem" className="block text-sm font-medium text-gray-700">
            Mensagem
        </label>
        <textarea
            id="mensagem"
            name="mensagem"
            required
            rows="4"
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Digite sua mensagem aqui..."
        ></textarea>
        </div>

        <button
        type="submit"
        className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-yellow-400 transition duration-300"
        >
        Enviar
        </button>

        <p className="text-center text-gray-600">ou</p>

        {/* Botão WhatsApp com pulso */}
        <a
          href="https://wa.me/5513997399924"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out flex justify-center items-center gap-3 overflow-hidden animate-pulse hover:animate-none"
        >
          {/* Círculos de pulso ao redor do botão */}
          <div className="absolute inset-0 rounded-2xl bg-green-400 animate-ping opacity-75"></div>
          <div className="absolute inset-0 rounded-2xl bg-green-500 animate-pulse"></div>
          
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:translate-x-full transition-all duration-700"></div>
          
          {/* Ícone do WhatsApp com animação */}
          <FaWhatsapp 
            size={24} 
            className="z-10 group-hover:rotate-12 transition-transform duration-300 drop-shadow-lg" 
          />
          
          <span className="z-10 text-lg drop-shadow-sm">Falar no WhatsApp</span>
          
          {/* Múltiplos indicadores de pulso */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-300 rounded-full animate-ping"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-bounce"></div>
        </a>

    </form>

    {/* Este é o meu modal que aparece quando o e-mail é enviado com sucesso. */}
    {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/30 backdrop-blur-md backdrop-saturate-150 rounded-xl border border-white/40 shadow-lg z-50">
        <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Mensagem enviada!</h2>
            <p className="text-gray-600 mb-4">Em breve entraremos em contato com você.</p>
            <button
            onClick={() => setShowModal(false)}
            className="mt-2 px-6 py-2 bg-emerald-900 text-white rounded-lg hover:bg-emerald-700 transition"
            >
            Fechar
            </button>
        </div>
        </div>
    )}
    </div>
);
}
