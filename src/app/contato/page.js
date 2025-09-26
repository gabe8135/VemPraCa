// src/app/contato/page.js
"use client";

import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function Contato() {
  const [showModal, setShowModal] = useState(false); // Para controlar a visibilidade do meu modal de sucesso.

  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    // Envio os dados do formulário para o Formspree.
    const response = await fetch("https://formspree.io/f/mzzeoedb", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: data,
    });

    // Se o envio for bem-sucedido, limpo o formulário e mostro o modal.
    if (response.ok) {
      form.reset();
      setShowModal(true);
    }
  }

  return (
    <div className="min-h-screen px-[5vw] md:px-[15vw] lg:px-[15vw] py-12 bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col mt-20 items-center">
      <h1 className="text-4xl font-bold text-center text-green-800 mb-4">
        Fale com a gente
      </h1>

      <p className="text-center text-gray-600 max-w-2xl mb-10">
        Quer cadastrar seu negócio? Tem alguma dúvida, sugestão ou só quer bater
        um papo? Fale com a gente! É só preencher o formulário abaixo ou mandar
        uma mensagem direto no meu WhatsApp.
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-white/90 backdrop-blur-sm rounded-[2rem] shadow-lg p-8 space-y-6 border border-emerald-100/70"
      >
        <div>
          <label
            htmlFor="nome"
            className="block text-sm font-medium text-gray-700"
          >
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            className="mt-1 w-full rounded-xl border border-emerald-200 px-4 py-3 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-emerald-200 px-4 py-3 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition"
            placeholder="seuemail@exemplo.com"
          />
        </div>

        <div>
          <label
            htmlFor="mensagem"
            className="block text-sm font-medium text-gray-700"
          >
            Mensagem
          </label>
          <textarea
            id="mensagem"
            name="mensagem"
            required
            rows="4"
            className="mt-1 w-full rounded-2xl border border-emerald-200 px-4 py-3 bg-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition resize-none"
            placeholder="Digite sua mensagem aqui..."
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white font-semibold py-4 rounded-2xl shadow-md hover:shadow-lg transition duration-300 group"
        >
          <span className="relative z-10 tracking-wide">Enviar</span>
          <span className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-white/20 to-teal-500/0 opacity-0 group-hover:opacity-100 translate-x-[-40%] group-hover:translate-x-[40%] transition-all duration-700" />
        </button>

        <p className="text-center text-gray-600">ou</p>

        {/* Botão WhatsApp com pulso */}
        <a
          href="https://wa.me/5513997399924"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative bg-white/90 backdrop-blur-sm border border-emerald-200 text-emerald-700 font-semibold py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 flex justify-center items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/0 via-emerald-100/70 to-emerald-100/0 opacity-0 group-hover:opacity-100 translate-x-[-30%] group-hover:translate-x-[30%] transition-all duration-700" />
          <FaWhatsapp
            size={24}
            className="relative z-10 group-hover:scale-110 transition-transform"
          />
          <span className="relative z-10 text-lg">Falar no WhatsApp</span>
        </a>
      </form>

      {/* Este é o meu modal que aparece quando o e-mail é enviado com sucesso. */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-emerald-900/15 backdrop-blur-sm z-50 p-4">
          <div className="bg-white/95 border border-emerald-100 rounded-3xl shadow-xl text-center max-w-sm w-full p-8 relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white">
              ✓
            </div>
            <h2 className="mt-8 text-2xl font-bold mb-3 text-emerald-800 tracking-tight">
              Mensagem enviada!
            </h2>
            <p className="text-emerald-700/80 text-sm mb-5 leading-relaxed">
              Em breve entraremos em contato com você.
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl hover:shadow-md transition font-semibold text-sm tracking-wide"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
