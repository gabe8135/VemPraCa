import Link from "next/link";
import Image from "next/image";
import { FaStar } from "react-icons/fa";

export default function BusinessCard({ business }) {
  const { id, nome, nome_categoria, media_avaliacoes, imagens, cidade } =
    business;

  const mainImage =
    imagens && imagens.length > 0
      ? imagens[0]
      : "https://via.placeholder.com/300?text=Sem+Foto";

  const rating = media_avaliacoes
    ? parseFloat(media_avaliacoes).toFixed(1)
    : null;

  // Exemplo de selo: destaque se avaliação >= 4.8
  const destaque = rating && parseFloat(rating) >= 4.8;

  return (
    <Link
      href={`/negocio/${id}`}
      className="group block overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-shadow duration-300 w-full bg-white border border-gray-100 relative"
    >
      {/* Imagem no topo, proporção Airbnb, cantos arredondados */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden rounded-2xl">
        <Image
          src={mainImage}
          alt={`Foto de ${nome}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/300?text=Erro";
          }}
        />
        {/* Selo flutuante */}
        {destaque && (
          <div className="absolute top-2 left-2 bg-white/90 text-gray-900 text-xs font-semibold px-3 py-1 rounded-full shadow">
            Destaque
          </div>
        )}
        {/* Nota/Avaliação no topo direito */}
        <div className="absolute top-2 right-2 flex items-center bg-white/90 text-yellow-600 text-xs md:text-sm font-bold px-2 py-1 rounded-full shadow">
          <FaStar className="mr-1 text-yellow-500" />
          <span>{rating ? rating : "--"}</span>
        </div>
      </div>
      {/* Infos centralizadas abaixo */}
      <div className="flex flex-col items-start justify-center px-4 py-3 text-left">
        <h3 className="font-bold text-base md:text-lg lg:text-xl leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2 break-words mb-1">
          {nome}
        </h3>
        <div className="flex flex-wrap items-center gap-1 text-xs md:text-sm text-gray-600 leading-tight mb-1">
          <span>{nome_categoria}</span>
          <span className="mx-1">&bull;</span>
          {cidade && <span>{cidade}</span>}
        </div>
      </div>
    </Link>
  );
}
