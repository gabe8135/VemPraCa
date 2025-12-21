// src/app/sobre/page.js
import {
  FaHome, // Ícone para "Sobre"
  FaGlobeAmericas, // Ícone para "Por que"
  FaStar, // Ícone para "Compromisso"
  FaHeart, // Ícone para "Feito com carinho"
  FaTools, // Ícone para "Como funciona"
  FaChartLine, // Ícone para "Impacto real"
  FaHandshake, // Ícone para "Parcerias"
  FaRocket, // Ícone para "Nosso futuro"
} from "react-icons/fa"; // Importando os ícones

const sections = [
  {
    icon: FaHome,
    title: "O que é a plataforma?",
    text: "Aqui você encontra hotéis, pousadas e serviços de turismo da nossa região. Tudo feito para valorizar quem é daqui.",
  },
  {
    icon: FaGlobeAmericas,
    title: "Por que ela existe?",
    text: "Quando você escolhe um lugar local, ajuda a cidade a crescer. Gera renda, empregos e vive experiências de verdade.",
  },
  {
    icon: FaStar,
    title: "Nosso compromisso",
    text: "Queremos conectar quem oferece serviços com quem procura. Tudo simples, fácil e feito para todo mundo usar.",
  },
  {
    icon: FaHeart,
    title: "Feito para todos",
    text: "Qualquer pessoa pode anunciar ou buscar aqui, mesmo sem saber de tecnologia. A plataforma é para todos.",
  },
  {
    icon: FaTools,
    title: "Como funciona?",
    text: "É só cadastrar seu negócio ou procurar o que precisa. Tudo rápido, seguro e sem complicação.",
  },
  {
    icon: FaChartLine,
    title: "Ajuda de verdade",
    text: "Cada reserva ou serviço feito aqui fortalece a economia local e ajuda famílias e pequenos negócios.",
  },
  {
    icon: FaHandshake,
    title: "Parcerias",
    text: "Trabalhamos junto com associações, projetos sociais e entidades locais para crescer ainda mais.",
  },
  {
    icon: FaRocket,
    title: "O que vem por aí?",
    text: "Vamos lançar novidades e melhorias sempre. Queremos evoluir junto com você.",
  },
];

import { Fade } from "react-awesome-reveal";

export default function Sobre() {
  return (
    <div className="min-h-screen overflow-x-hidden relative mt-25 bg-gray-50">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <Fade direction="up" triggerOnce>
          <h1 className="text-3xl font-bold text-center text-green-800 mb-10 md:mb-14">
            Sobre a plataforma
          </h1>
        </Fade>
        <Fade direction="right" cascade damping={0.16} triggerOnce>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-2xl shadow-xl border border-emerald-100 hover:scale-[1.025] hover:shadow-2xl transition-all duration-300 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 p-2 shadow-sm">
                      <Icon className="text-green-600 w-6 h-6 flex-shrink-0" />
                    </span>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base flex-grow">
                    {section.text}
                  </p>
                </div>
              );
            })}
          </div>
        </Fade>
      </div>
    </div>
  );
}
