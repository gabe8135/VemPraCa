// src/app/components/FAQSection.js
"use client";
import Link from "next/link";
import { Fade } from "react-awesome-reveal";
import { useState, useRef } from "react";

// Meu array com as perguntas e respostas para o FAQ.
const faqData = [
  {
    question: "Como faço para achar o que preciso no VemPraCá?",
    answer:
      "É fácil! Você pode rolar a página inicial, usar a busca para digitar o nome ou cidade, ou clicar nas categorias para ver só o tipo de lugar que procura.",
  },
  {
    question: "Preciso pagar para procurar serviços aqui?",
    answer:
      "Não! Procurar e encontrar negócios no VemPraCá é totalmente grátis para quem está buscando um serviço.",
  },
  {
    question: "Como falo com o lugar que quero?",
    answer:
      "É só clicar no nome do lugar. Vai abrir uma página com telefone, WhatsApp (se tiver) e, às vezes, site ou redes sociais para você falar direto.",
  },
  {
    question: "Tenho um negócio. Como faço para aparecer aqui?",
    answer:
      "Primeiro, crie sua conta e faça login. Depois, vá em 'Meus Negócios' no menu e preencha o cadastro com as informações e fotos do seu negócio.",
  },
  {
    question: "Quanto custa para cadastrar meu negócio?",
    answer:
      "Temos planos mensais e anuais! Veja os detalhes na página de planos ou fale com a gente.",
  },
  {
    question: "Como faço para mudar as informações do meu negócio?",
    answer:
      "Depois de fazer login, vá em 'Meus Negócios'. Se já cadastrou seu negócio, vai aparecer a página dele e lá tem opção para editar tudo que quiser.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const contentRefs = useRef([]);

  const handleToggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section
      id="faq"
      className="bg-gradient-to-r from-green-600 to-emerald-700 text-white py-12 md:py-16"
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-white mb-8 md:mb-12">
          Perguntas Frequentes
        </h2>
        <div className="max-w-3xl mx-auto space-y-4">
          <Fade direction="right" cascade damping={0.18} triggerOnce>
            {faqData.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className={`group bg-white p-4 rounded-3xl transition duration-300 overflow-hidden
                    shadow-sm hover:shadow-md
                    ${isOpen ? "shadow-2xl ring-2 ring-white-200" : ""}
                  `}
                >
                  <button
                    className="w-full flex justify-between items-center font-semibold text-gray-700 cursor-pointer list-none bg-transparent border-none outline-none"
                    onClick={() => handleToggle(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-content-${index}`}
                  >
                    <span>{item.question}</span>
                    <span
                      className={`transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <svg
                        fill="none"
                        height="24"
                        shapeRendering="geometricPrecision"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        width="24"
                      >
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </span>
                  </button>
                  <div
                    id={`faq-content-${index}`}
                    ref={(el) => (contentRefs.current[index] = el)}
                    style={{
                      maxHeight: isOpen
                        ? contentRefs.current[index]?.scrollHeight + "px"
                        : "0px",
                      transition: "max-height 0.5s cubic-bezier(.4,0,.2,1)",
                      overflow: "hidden",
                    }}
                  >
                    <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </Fade>
        </div>
        <div className="text-center mt-8">
          <h3 className="text-2xl font-bold text-center text-white my-8 md:mb-12">
            Ficou com alguma duvida? não deixe de perguntar!
          </h3>
          <Link
            href="/contato/"
            className="font-bold bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full hover:bg-gradient-to-r from-amber-300 to-yellow-400 text-green-600 p-2"
          >
            Contato
          </Link>
        </div>
      </div>
    </section>
  );
}
