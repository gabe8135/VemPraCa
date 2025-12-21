// src/app/components/HowItWorksSection.js
"use client";

import Link from "next/link"; // Preciso do Link para o botão "Saiba mais".
import { FaSearch, FaHotel, FaWhatsapp, FaEdit } from "react-icons/fa"; // Importando ícones do react-icons para substituir os emojis.
import { Fade } from "react-awesome-reveal";

// Meus passos de "Como Funciona".
const steps = [
  {
    icon: <FaSearch className="text-emerald-600 drop-shadow-lg" />,
    title: "Encontre o lugar",
    description: "Procure o destino que você quer conhecer.",
    target: "viajante",
  },
  {
    icon: <FaHotel className="text-emerald-600 drop-shadow-lg" />,
    title: "Veja as opções",
    description: "Veja fotos e o que cada lugar oferece.",
    target: "viajante",
  },
  {
    icon: <FaWhatsapp className="text-emerald-600 drop-shadow-lg" />,
    title: "Fale direto",
    description: "Converse pelo WhatsApp para tirar dúvidas ou reservar.",
    target: "viajante",
  },
  {
    icon: <FaEdit className="text-emerald-600 drop-shadow-lg" />,
    title: "Ou cadastre seu negócio",
    description: "Tem um local? Cadastre grátis e receba visitantes.",
    target: "proprietario",
    link: "/como-funciona",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 relative">
      {/* Fundo decorativo removido */}
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-extrabold text-center text-emerald-700 mb-12 tracking-tight drop-shadow-lg">
          Como Funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 items-stretch">
          <Fade direction="up" cascade damping={0.18} triggerOnce>
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-7 bg-white rounded-3xl shadow-lg border border-emerald-100 hover:scale-[1.03] transition-transform duration-300 h-full"
              >
                <span className="text-5xl mb-5 rounded-full bg-emerald-100/60 p-4 flex items-center justify-center shadow-md">
                  {step.icon}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-emerald-700 mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-gray-700 text-base mb-6 flex-grow leading-relaxed">
                  {step.description}
                </p>
                {step.link && (
                  <Link
                    href={step.link}
                    className="mt-auto bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-2 rounded-full text-base text-white font-semibold shadow hover:from-emerald-700 hover:to-green-600 hover:text-yellow-300 transition-all duration-200"
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
