// src/app/components/Hero.js
import Link from 'next/link';
import Marquee from "react-fast-marquee";

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
        className=" px-4 py-2 rounded-full  mx-2 text-sm font-medium whitespace-nowrap text-white cursor-default"
      >
        {category}
      </span>
    ))}
  </>
);

export default function Hero() {
    return (
    // Container principal da Hero section, ocupa a tela toda.
    <div className="relative w-full h-screen mb-5">

        {/* Imagem de fundo da Hero. */}
        <img src="https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site//hero.jpg" alt="hero" className="brightness-95 absolute inset-0 w-full h-full object-cover"/>

        {/* Conteúdo centralizado sobre a imagem. */}
        {/* Este div também contém o carrossel de categorias. */}
        <div className="pb-20 relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-2xl">Bem-vindo ao Vem Pra Cá 🡵</h1>
            <p className="text-lg md:text-xl mb-8 drop-shadow-2xl">Encontre tudo que precisa em um lugar só!</p>
            {/* Botão para rolar até a seção de busca. */}
            <button onClick={() => {
                const section = document.getElementById('search-section');
                section?.scrollIntoView({ behavior: 'smooth' }); }}
                className="bg-green-500 hover:bg-yellow-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg transition duration-300">
                Ver Mais
            </button>

            {/* --- Minha Seção do Carrossel de Categorias --- */}
            {/* Container externo do carrossel, com margem superior e estilização. */}
            <div className="w-full max-w-4xl mt-10 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white bg-opacity-90 backdrop-blur-sm overflow-hidden rounded-lg shadow-md"> {/* Adicionei max-w, rounded, shadow aqui. */}
                <Marquee
                    gradient={false} // Sem gradiente nas bordas do Marquee.
                    speed={50}       // Velocidade do carrossel.
                    pauseOnHover={true} // Pausa quando o mouse está sobre ele.
                >
                    {/* Renderizo a lista de categorias duas vezes para o efeito de loop contínuo. */}
                    <div className="flex items-center justify-around px-2">
                        <CategoryList />
                    </div>
                    {/* Este div vazio ajuda na transição suave do Marquee. */}
                    <div className="w-4 flex-shrink-0"></div>
                </Marquee>
            </div>
            {/* --- Fim da Seção do Carrossel --- */}

        </div>
        {/* O carrossel não está mais aqui embaixo, foi movido para dentro do conteúdo central. */}
    </div>
    );
}
