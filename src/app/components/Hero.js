// src/app/components/Hero.js

import Link from "next/link";
import Marquee from "react-fast-marquee";
import Image from "next/image";
import Header from "./Header";
import { useEffect, useState, useMemo } from "react";

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

  // Pré-carrega a primeira imagem e carrega as demais de forma lazy
  useEffect(() => {
    let isMounted = true;
    const img = new window.Image();
    img.src = images[0];
    img.onload = () => {
      if (isMounted) setLoading(false);
      // Lazy load das outras imagens
      images.slice(1).forEach((src) => {
        const lazyImg = new window.Image();
        lazyImg.src = src;
      });
    };
    return () => {
      isMounted = false;
    };
  }, [images]);

  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000); // Troca a cada 4 segundos
    return () => clearInterval(interval);
  }, [images.length, loading]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Carrossel de fundo animado */}
      {images.map((img, idx) => (
        <div
          key={img}
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url('${img}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: idx === current ? 1 : 0,
            zIndex: 0,
            pointerEvents: "none",
            transition: "opacity 1.2s cubic-bezier(0.4,0,0.2,1)",
            willChange: "opacity",
          }}
        />
      ))}
      {/* Overlay escuro para contraste */}
      {/* <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-emerald-900/30 z-0"></div> */}

      {/* Conteúdo centralizado */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-2xl px-4 pb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl shadow-3xl p-8 w-full text-center border-2 border-white/10">
          <div className="w-full overflow-x-hidden mb-6">
            <Marquee gradient={false} speed={40}>
              <CategoryList />
            </Marquee>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white font-montserrat sm:text-7xl mb-4 break-words drop-shadow-lg">
            O ponto de encontro dos negócios locais
          </h1>
          <p className="mt-2 text-base sm:text-lg font-medium text-white font-inter sm:text-xl break-words drop-shadow">
            Descubra promoções e serviços incríveis perto de você
            <br />
            Aproveite agora e viva experiências únicas!
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 w-full">
            <Link
              href="#search-section"
              className="rounded-full bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-lg hover:from-emerald-700 hover:to-green-600 transition max-w-full"
            >
              Ver Ofertas
            </Link>
            <Link
              href="/sobre"
              className="text-lg font-semibold text-white hover:text-green-700 transition max-w-full"
            >
              Saiba mais <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
