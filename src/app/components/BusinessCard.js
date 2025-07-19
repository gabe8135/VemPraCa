import Link from 'next/link';
import Image from 'next/image';
import { FaStar } from 'react-icons/fa';

export default function BusinessCard({ business }) {
  const { id, nome, nome_categoria, media_avaliacoes, imagens, cidade } = business;

  const mainImage = imagens && imagens.length > 0
    ? imagens[0]
    : 'https://via.placeholder.com/300?text=Sem+Foto';

  const rating = media_avaliacoes ? parseFloat(media_avaliacoes).toFixed(1) : null;

  return (
    <Link
      href={`/negocio/${id}`}
      className="group block overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 w-full max-w-full"
    >
      <div className="relative w-full aspect-square overflow-hidden max-w-full">
        <Image
          src={mainImage}
          alt={`Foto de ${nome}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/300?text=Erro';
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {rating && (
          <div className="absolute top-2 right-2 flex items-center bg-yellow-400 text-gray-900 text-xs md:text-sm font-bold px-2 py-1 rounded-full shadow-lg">
            <FaStar className="mr-1 text-gray-800" />
            <span>{rating}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 p-2 md:p-3 text-white w-full max-w-full overflow-hidden">
          <h3 className="font-bold text-sm md:text-base lg:text-lg leading-tight group-hover:text-yellow-300 transition-colors line-clamp-2 break-words">
            {nome}
          </h3>

          <div className="flex flex-wrap items-baseline text-xs md:text-sm text-gray-200 leading-tight break-words">
            <span>{nome_categoria}</span>
            <span className="mx-1.5">&bull;</span>
            {cidade && (
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
