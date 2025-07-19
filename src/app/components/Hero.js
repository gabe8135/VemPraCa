// src/app/components/Hero.js
import Link from "next/link";
import Marquee from "react-fast-marquee";
import Image from "next/image"

// Minha lista de categorias para o carrossel da Hero.
const categories = [
  "Hotéis e Pousadas", "Campings", "Restaurantes", "Lanchonetes",
  "Cafeterias", "Farmácias", "Clínicas", "Oficinas", "Borracharias",
  "Agências de Turismo", "Guias Turísticos", "Lojas em Geral"
];

// Componente simples para renderizar a lista de categorias dentro do Marquee.
const CategoryList = () => (
  <>
    {categories.map((category, index) => (
      <span
        key={index}
        className=" px-4 py-2 rounded-full mx-2 text-sm font-medium whitespace-nowrap text-emerald-700 cursor-default"
      >
        {category}
      </span>
    ))}
  </>
);

export default function Hero() {
  return (
    <section className="relative isolate pt-5 h-full bg-white ">
      {/* Fundo decorativo superior */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl w-full"
      >
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="aspect-[1155/678] w-full max-w-screen-xl mx-auto bg-gradient-to-tr from-green-600 to-emerald-700 opacity-40"
        />
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-32 sm:py-48 lg:py-56">
        <div className="text-center">
          <div className="w-full overflow-x-hidden">
            <Marquee gradient={false} speed={40}>
              <CategoryList />
            </Marquee>
          </div>
          <div className="flex items-center justify-center mx-auto mb-8 mt-8 w-48 sm:w-64 lg:w-72 h-auto">
            <span className="text-4xl sm:text-5xl font-bold text-green-700 font-montserrat flex items-center gap-2">
              VemPraCá
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-green-700 font-montserrat sm:text-7xl mb-6 break-words">
            Ofertas exclusivas perto de você
          </h1>
          <p className="mt-4 text-base sm:text-lg font-medium text-green-700 font-inter sm:text-xl break-words">
            Descubra promoções e serviços incríveis na sua região. Aproveite agora e viva experiências únicas!
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 w-full">
            <Link
              href="#search-section"
              className="rounded-full bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow hover:from-emerald-700 hover:to-green-600 transition max-w-full"
            >
              Ver Ofertas
            </Link>
            <Link
              href="/sobre"
              className="text-lg font-semibold text-[#F0B100] hover:text-green-700 transition max-w-full"
            >
              Saiba mais <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
      {/* Fundo decorativo inferior, mais forte e ultrapassando a Hero */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 bottom-0 -translate-x-1/2 -z-10 transform-gpu overflow-visible blur-[80px] w-[120vw] h-[300px] pointer-events-none"
        style={{ maxWidth: 'none' }}
      >
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="w-full h-full bg-gradient-to-tr from-green-600 to-emerald-700 opacity-50"
        />
      </div>
    </section>
  );
}
