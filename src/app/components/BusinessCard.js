import Link from 'next/link';
import Image from 'next/image';
import { FaStar } from 'react-icons/fa'; // Usando react-icons para a estrela

export default function BusinessCard({ business }) {
  // Desestrutura as propriedades do negócio para facilitar o uso.
const { id, nome, nome_categoria, media_avaliacoes, imagens, cidade } = business;

  // Define a imagem principal ou uma imagem padrão (placeholder).
const mainImage = imagens && imagens.length > 0 ? imagens[0] : 'https://via.placeholder.com/300?text=Sem+Foto';

  // Formata a avaliação para ter uma casa decimal.
const rating = media_avaliacoes ? parseFloat(media_avaliacoes).toFixed(1) : null;

return (
    <Link href={`/negocio/${id}`} className="group block overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 bg-white">
    <div className="relative aspect-square w-full">
        <Image
        src={mainImage}
        alt={`Foto de ${nome}`}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
        onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300?text=Erro'; }}
        />
        {/* Overlay para melhorar a legibilidade do texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

        {/* Selo de Avaliação */}
        {rating && (
        <div className="absolute top-2 right-2 flex items-center bg-yellow-400 text-gray-900 text-xs md:text-sm font-bold px-2 py-1 rounded-full shadow-lg">
            <FaStar className="mr-1 text-gray-800" />
            <span>{rating}</span>
        </div>
        )}

        {/* Conteúdo de Texto */}
        <div className="absolute bottom-0 left-0 p-2 md:p-3 text-white w-full">
        <h3 className="font-bold text-sm md:text-base lg:text-lg leading-tight group-hover:text-yellow-300 transition-colors line-clamp-2">
            {nome}
        </h3>
          {/* Container para categoria e cidade, com quebra de linha automática */}
        <div className="flex flex-wrap items-baseline text-xs md:text-sm text-gray-200 leading-tight">
            <span>{nome_categoria}</span>
            <span className="mx-1.5">&bull;</span>
            {cidade && (
              // Este span mostra a cidade do negocio em questao 
            <span className="inline-flex items-baseline whitespace-nowrap">
                <span>{cidade}</span>
            </span>
            )}
        </div>
        </div>
    </div>
    </Link>
);
}