"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo, useRef } from "react";

// Card/grid de estandes no estilo "cards de negócios" simplificado:
// - foto fixa public/event/caicara.webp
// - nome do estande
// - nome do proprietário (placeholder por enquanto)
// - média de estrelas (calculada por fetch na API)
export default function FestaCaicaraStandGrid({ stands }) {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    let isMounted = true;
    // Busca métricas gerais e mapeia por slug
    fetch("/api/eventos/festa-caicara/avaliacoes")
      .then((r) => r.json())
      .then((j) => {
        if (!isMounted) return;
        const m = {};
        // Índice de alias -> slug canônico
        const aliasToCanonical = new Map();
        try {
          (stands || []).forEach((s) => {
            aliasToCanonical.set(s.slug, s.slug);
            if (Array.isArray(s.aliases)) {
              s.aliases.forEach((a) => aliasToCanonical.set(a, s.slug));
            }
          });
        } catch {}
        if (j?.ranking?.length) {
          j.ranking.forEach((it) => {
            const targetSlug = aliasToCanonical.get(it.slug) || it.slug;
            const prev = m[targetSlug] || { total: 0, soma: 0 };
            // Consolida métricas caso venham separadas por alias
            m[targetSlug] = {
              total: (prev.total || 0) + (it.total || 0),
              media:
                ((prev.media || 0) * (prev.total || 0) +
                  (it.media || 0) * (it.total || 0)) /
                ((prev.total || 0) + (it.total || 0) || 1),
            };
          });
        }
        setMetrics(m);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [stands]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {stands.map((s) => {
        const m = metrics[s.slug] || { total: 0, media: 0 };
        return (
          <Link
            key={s.slug}
            href={`/eventos/festa-caicara/estandes/${s.slug}`}
            className="group flex flex-col rounded-2xl overflow-hidden bg-white ring-1 ring-emerald-100 shadow-sm hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div className="h-36 md:h-40 bg-gray-100 overflow-hidden relative">
              <StandImage slug={s.slug} alt={s.nome} />
            </div>
            <div className="p-4 flex flex-col gap-2">
              <h3 className="text-lg font-bold text-emerald-700 group-hover:text-emerald-800">
                {s.nome}
              </h3>
              <div className="flex items-center gap-2">
                <StarReadonly value={m.media} />
                <span className="text-xs text-gray-600">({m.total})</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">
                {s.descricao}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StarReadonly({ value = 0 }) {
  // desenha 5 estrelas preenchidas proporcionalmente à média (0..5)
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const stars = useMemo(() => {
    return new Array(5).fill(0).map((_, i) => {
      if (i < full) return "full";
      if (i === full && hasHalf) return "half";
      return "empty";
    });
  }, [full, hasHalf]);
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((t, idx) => (
        <StarIcon key={idx} type={t} />
      ))}
    </div>
  );
}

function StarIcon({ type }) {
  const cls =
    type === "full"
      ? "text-yellow-400"
      : type === "half"
        ? "text-yellow-400"
        : "text-gray-300";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-5 h-5 ${cls}`}
      aria-hidden="true"
    >
      {/* Estrela simples; para half, desenhamos um overlay */}
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.166L12 18.896l-7.336 3.867 1.402-8.166L.132 9.21l8.2-1.192z" />
      {type === "half" && (
        <rect x="0" y="0" width="12" height="24" fill="white" />
      )}
    </svg>
  );
}

// Exibe a imagem do estande baseada no slug, com fallbacks automáticos.
// Ordem de tentativa: /event/<slug>.webp -> /event/<slug>.png -> /event/caicara.webp
function StandImage({ slug, alt }) {
  const [src, setSrc] = useState(`/event/${slug}.webp`);
  const triedPng = useRef(false);
  const handleError = () => {
    if (!triedPng.current && src.endsWith('.webp')) {
      triedPng.current = true;
      setSrc(`/event/${slug}.png`);
    } else if (src.indexOf('/event/caicara.webp') === -1) {
      setSrc('/event/caicara.webp');
    }
  };
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover"
      priority={false}
      onError={handleError}
    />
  );
}
