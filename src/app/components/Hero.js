// src/app/components/Hero.js

import Link from "next/link";
import Marquee from "react-fast-marquee";
import Image from "next/image";
import Header from "./Header";
import { useEffect, useState, useMemo } from "react";
import { FiSearch, FiBriefcase } from "react-icons/fi";

// Minha lista de categorias para o carrossel da Hero.
const categories = [
  "Hotéis e Pousadas",
  "Campings",
  "Restaurantes",
  "Lanchonetes",
  "Cafeterias",
  "Farmácias",
  "Clínicas",
  "Oficinas",
  "Borracharias",
  "Agências de Turismo",
  "Guias Turísticos",
  "Lojas em Geral",
];

// Componente simples para renderizar a lista de categorias dentro do Marquee.
const CategoryList = () => (
  <>
    {categories.map((category, index) => (
      <span
        key={index}
        className=" px-4 py-2 rounded-full mx-2 text-sm font-medium whitespace-nowrap text-white cursor-default"
      >
        {category}
      </span>
    ))}
  </>
);

export default function Hero() {
  // Lista das imagens do carrossel
  // Ordem decrescente das imagens, usando useMemo para evitar recriação
  const images = useMemo(
    () => [
      "/img/HERO-7.webp",
      "/img/HERO-6.webp",
      "/img/HERO-5.webp",
      "/img/HERO-4.webp",
      "/img/HERO-3.webp",
      "/img/HERO-2.webp",
      "/img/HERO-1.webp",
    ],
    []
  );
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pré-carrega a primeira imagem (usando next/image priority) e carrega as demais de forma lazy
  useEffect(() => {
    setLoading(false); // next/image cuida do carregamento e prioridade
  }, []);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000); // Troca a cada 4 segundos
    return () => clearInterval(interval);
  }, [images.length, loading]);

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Carrossel de fundo animado otimizado com next/image */}
      {images.map((img, idx) => (
        <div
          key={img}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: idx === current ? 1 : 0,
            zIndex: 0,
            pointerEvents: "none",
            transition: "opacity 1.2s cubic-bezier(0.4,0,0.2,1)",
            willChange: "opacity",
          }}
        >
          <Image
            src={img}
            alt="Banner"
            fill
            priority={idx === 0}
            quality={70}
            sizes="100vw"
            className="object-cover"
            draggable={false}
          />
        </div>
      ))}
      {/* Overlay para contraste e foco na mensagem */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.28)_30%,rgba(0,0,0,0.22)_65%,rgba(0,0,0,0.12))] z-0" />

      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-3xl px-4 pb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl shadow-3xl p-8 w-full text-center border-2 border-white/10">
          <div className="w-full overflow-x-hidden mb-6">
            <Marquee gradient={false} speed={40}>
              <CategoryList />
            </Marquee>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-montserrat mb-3 break-words drop-shadow-lg">
            O ponto de encontro dos negócios locais
          </h1>
          <p className="mt-1 text-base sm:text-xl font-medium text-white/95 font-inter break-words drop-shadow">
            Encontre promoções e serviços reais perto de você.
            <span className="hidden sm:inline">
              {" "}
              Role ou use os botões abaixo.
            </span>
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Link
              href="#search-section"
              onClick={() => {
                // foca o campo de busca ao chegar na seção
                setTimeout(() => {
                  const el = document.getElementById("searchTerm");
                  if (el) el.focus();
                }, 350);
              }}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-lg hover:from-emerald-700 hover:to-green-600 transition"
            >
              <FiSearch className="mr-2 h-5 w-5" aria-hidden />
              Buscar agora!
            </Link>
            <Link
              href="/meus-negocios"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-lg font-semibold text-white ring-1 ring-white/70 hover:ring-white bg-white/10 hover:bg-white/15 transition"
            >
              <FiBriefcase className="mr-2 h-5 w-5" aria-hidden />
              Anuncie seu negócio
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/90">
            Logo abaixo você encontra as melhores ofertas e categorias.
          </p>
        </div>
      </div>

      {/* Seta de scroll para indicar conteúdo abaixo */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <Link
          href="#search-section"
          aria-label="Ir para as ofertas"
          className="group inline-flex flex-col items-center text-white/90 hover:text-white"
        >
          <span className="text-xs mb-1 opacity-90">Ver ofertas abaixo</span>
          <svg
            className="h-6 w-6 animate-bounce"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
