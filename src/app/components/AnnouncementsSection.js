"use client";

import Image from "next/image";
import { Fade } from "react-awesome-reveal";
import {
  FiClock,
  FiMessageCircle,
  FiTrendingUp,
  FiZap,
  FiCheckCircle,
} from "react-icons/fi";

const whatsappMessage = encodeURIComponent(
  "Ola! Vi o anuncio no VemPraCa e quero criar um chatbot de WhatsApp para o meu negocio. Pode me passar os detalhes?",
);

const whatsappLink = `https://wa.me/5513997399924?text=${whatsappMessage}`;

const highlights = [
  {
    icon: FiClock,
    text: "Atendimento automatico 24h",
  },
  {
    icon: FiMessageCircle,
    text: "Respostas instantaneas e personalizadas",
  },
  {
    icon: FiTrendingUp,
    text: "Mais leads e mais conversoes",
  },
  {
    icon: FiZap,
    text: "Implementacao rapida no seu negocio",
  },
];

export default function AnnouncementsSection() {
  return (
    <Fade triggerOnce direction="up" duration={700}>
      <section className="relative mt-4 w-[95%] max-w-5xl mx-auto mb-10 rounded-3xl shadow-2xl shadow-emerald-900/20 overflow-hidden ring-1 ring-emerald-200/50">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.25),transparent_40%),radial-gradient(circle_at_95%_0%,rgba(20,184,166,0.2),transparent_40%)]" />
        <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />

        <div className="relative bg-gradient-to-br from-[#ECFDF5] via-[#F0FDFA] to-white p-6 md:p-10 text-emerald-900 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5 order-2 md:order-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold tracking-wide uppercase">
              <FiCheckCircle className="h-4 w-4" />
              Solucao Premium Para Atendimento
            </span>

            <header className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-950 leading-tight">
                Crie Seu Chatbot de WhatsApp e Atenda Seus Clientes 24 Horas
              </h2>
              <p className="text-emerald-900/85 text-sm md:text-base leading-relaxed">
                Transforme o WhatsApp do seu negocio em uma maquina de vendas:
                respostas inteligentes, qualificacao de leads, agendamentos e
                suporte automatico com a linguagem da sua marca.
              </p>
            </header>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {highlights.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="rounded-xl bg-white/80 border border-emerald-100 px-3 py-2 text-sm text-emerald-900 flex items-center gap-2"
                >
                  <Icon className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-400/40 transition-all"
                aria-label="Entrar em contato no WhatsApp para criar chatbot"
              >
                <FiMessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                Quero Meu Chatbot No WhatsApp
              </a>
            </div>

            <p className="text-xs text-emerald-800/80">
              Clique no botao e fale direto no WhatsApp: 13 99739-9924.
            </p>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative h-64 md:h-80 w-full overflow-hidden rounded-2xl ring-1 ring-emerald-200/70 bg-gradient-to-br from-emerald-700 to-teal-700">
              <Image
                src="/img/whatsapp-chatbot-cta.svg"
                alt="Ilustracao de chatbot de WhatsApp para negocios"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover animate-[floatY_6s_ease-in-out_infinite]"
              />

              <div className="absolute left-3 top-3 rounded-xl bg-white/90 backdrop-blur px-3 py-2 shadow-lg animate-[floatY_4.5s_ease-in-out_infinite]">
                <p className="text-[11px] font-semibold text-emerald-900">
                  Atendimento em segundos
                </p>
              </div>

              <div className="absolute right-3 bottom-3 rounded-xl bg-emerald-950/75 backdrop-blur px-3 py-2 shadow-lg animate-[floatY_5.2s_ease-in-out_infinite]">
                <p className="text-[11px] font-semibold text-emerald-100">
                  Mais conversas, mais vendas
                </p>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes floatY {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-8px);
            }
          }
        `}</style>
      </section>
    </Fade>
  );
}
