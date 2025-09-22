// src/app/components/HowItWorksSection.js
"use client";

import Link from "next/link"; // Preciso do Link para o botão "Saiba mais".
import { FaSearch, FaHotel, FaWhatsapp, FaEdit } from "react-icons/fa"; // Importando ícones do react-icons para substituir os emojis.
import { Fade } from "react-awesome-reveal";

// Meus passos de "Como Funciona".
const steps = [
  {
    icon: <FaSearch className="text-green-700" />, // Lembrete: Posso trocar por um ícone do react-icons, tipo <FaSearch />.
    title: "Busque seu Destino",
    description:
      "Use a busca ou explore as categorias para encontrar o lugar perfeito.",
    target: "viajante",
  },
  {
    icon: <FaHotel className="text-green-700" />, // Lembrete: <FaHotel />
    title: "Escolha o Serviço Desejado",
    description:
      "Veja fotos, detalhes, facilidades e avaliações dos nossos parceiros locais.",
    target: "viajante",
  },
  {
    icon: <FaWhatsapp className="text-green-700" />, // Lembrete: <FaWhatsapp /> ou <FaPhone />
    title: "Conecte-se Direto",
    description:
      "Entre em contato diretamente com o estabelecimento para tirar dúvidas ou reservar.",
    target: "viajante",
  },
  {
    icon: <FaEdit className="text-green-700" />, // Lembrete: <FaEdit />
    title: "Cadastre seu Negócio",
    description:
      "É proprietário? Faça login e adicione seu estabelecimento em poucos passos.",
    target: "proprietario",
    link: "/como-funciona", // Este link leva para a página que explica como cadastrar o negócio.
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 relative">
      {/* Fundo esfumaçado decorativo em tons de verde, sem limites */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[140vw] h-[300px] -z-10 pointer-events-none overflow-visible blur-[90px]"
        style={{ maxWidth: "none" }}
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="w-full h-full bg-gradient-to-r from-green-600 via-emerald-500 to-emerald-700 opacity-60"
        />
      </div>
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-extrabold text-center text-emerald-700 mb-12 tracking-tight drop-shadow-lg">
          Como Funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-stretch">
          <Fade direction="up" cascade damping={0.18} triggerOnce>
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-8 bg-white/90 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 h-full"
              >
                <span className="text-5xl mb-4 drop-shadow-lg">
                  {step.icon}
                </span>
                <h3 className="text-xl font-bold text-emerald-700 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-700 text-base mb-6 flex-grow">
                  {step.description}
                </p>
                {step.link && (
                  <Link
                    href={step.link}
                    className="mt-auto bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-2 rounded-full text-base text-white font-semibold shadow hover:from-emerald-700 hover:to-green-600 hover:text-yellow-300 transition-all duration-200"
                  >
                    Saiba mais
                  </Link>
                )}
              </div>
            ))}
          </Fade>
        </div>
      </div>
    </section>
  );
}
