"use client";

import { Fade, Zoom } from "react-awesome-reveal";
import Link from "next/link";

const planos = [
  {
    nome: "Plano Mensal",
    preco: "R$ 25,00/mês",
    descricao: [
      "Seu negócio visível na busca",
      "Página exclusiva com fotos, contatos e localização",
      "Suporte por e-mail",
      "Suporte por Whatsapp",
    ],
    destaque: false,
  },
  {
    nome: "Plano Anual",
    preco: "R$ 290,00/ano",
    descricao: [
      "Tudo do Mensal",
      "Economize 2 meses",
      "Renovação automática",
      "Suporte completo",
    ],
    destaque: true,
  },
  {
    nome: "Anunciar Vagas/Empregos/Evento",
    preco: "R$ 50,00/mês",
    descricao: [
      "Anuncie vagas de emprego, eventos ou oportunidades",
      "Destaque especial na plataforma",
      "Página exclusiva para o anúncio",
      "Suporte dedicado",
    ],
    destaque: false,
  },
];

export default function PlanosPage() {
  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-700 min-h-screen py-16 px-4 text-white">
      <div className="max-w-4xl mx-auto">
        <Fade triggerOnce>
          <h1
            id="planos-titulo"
            className="text-4xl md:text-5xl font-extrabold text-center mb-4 tracking-tight font-[MyriadPro,Inter,sans-serif] drop-shadow-lg mt-32 scroll-mt-32 sm:mt-40 sm:scroll-mt-40"
          >
            Planos para Anunciar
          </h1>
        </Fade>
        <Fade delay={100} triggerOnce>
          <p className="text-center text-lg md:text-xl mb-12 max-w-2xl mx-auto text-emerald-50/90">
            Confira nossos planos para anunciar seu negócio, vagas de emprego ou
            eventos na plataforma. Em breve teremos ainda mais opções!
          </p>
        </Fade>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {planos.map((plano, idx) => (
            <Zoom delay={idx * 100} triggerOnce key={plano.nome}>
              <div
                className={`flex flex-col items-center bg-white/90 text-emerald-900 rounded-2xl shadow-xl p-8 border-2 transition-all duration-300 w-full min-w-[260px] max-w-[340px] mx-auto
                  ${plano.destaque ? "border-yellow-400 scale-105 shadow-2xl" : "border-emerald-100"}
                `}
              >
                {plano.destaque && (
                  <span className="mb-2 px-3 py-1 bg-yellow-400 text-green-900 rounded-full text-xs font-bold uppercase tracking-wider shadow">
                    Mais Popular
                  </span>
                )}
                <h2 className="text-2xl font-bold mb-2 text-center">
                  {plano.nome}
                </h2>
                <div className="text-3xl font-extrabold mb-4">
                  {plano.preco}
                </div>
                <ul className="mb-6 space-y-2 text-sm text-emerald-800">
                  {plano.descricao.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-green-600">✔</span> {item}
                    </li>
                  ))}
                </ul>
                {plano.nome.includes("Vaga") ||
                plano.nome.includes("Emprego") ||
                plano.nome.includes("Evento") ? (
                  <Link
                    href="/contato"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-green-900 font-semibold shadow border border-yellow-300 text-sm transition"
                  >
                    Anunciar agora
                  </Link>
                ) : null}
              </div>
            </Zoom>
          ))}
        </div>
      </div>
    </div>
  );
}
