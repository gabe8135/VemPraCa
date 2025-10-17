"use client";
import { useEffect, useMemo, useState } from "react";

export default function FestaCaicaraStandReviews({ slug }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    // Busca lista real de avaliações mais recentes deste estande
    fetch(
      `/api/eventos/festa-caicara/avaliacoes?list=1&limit=10&estande_slug=${encodeURIComponent(
        slug
      )}`
    )
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j?.error || r.statusText);
        }
        return r.json();
      })
      .then((j) => {
        const list = Array.isArray(j?.items) ? j.items : [];
        setItems(list);
        setError(null);
      })
      .catch((e) => setError(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return <p className="text-sm text-gray-500">Carregando avaliações...</p>;
  if (error) return <p className="text-sm text-red-600">Erro: {error}</p>;
  if (!items.length)
    return (
      <p className="text-sm text-gray-500">
        Ainda não há avaliações para este estande.
      </p>
    );

  return (
    <div className="mt-4 space-y-3">
      {items.map((it) => (
        <article
          key={it.id}
          className="p-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 text-sm text-gray-800"
        >
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StarReadonly value={it.nota || 0} />
              <span className="text-xs text-gray-600">
                {Number(it.nota || 0).toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(it.created_at)}
            </div>
          </header>
          <div className="mt-2">
            <p className="font-medium text-emerald-800 text-xs">
              {it.nome || "Anônimo"}
            </p>
            {it.comentario ? (
              <p className="mt-1 text-gray-700">{it.comentario}</p>
            ) : (
              <p className="mt-1 text-gray-500">(Sem comentário)</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function StarReadonly({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const hasHalf = v - full >= 0.5;
  const stars = useMemo(() => {
    return new Array(5).fill(0).map((_, i) => {
      if (i < full) return "full";
      if (i === full && hasHalf) return "half";
      return "empty";
    });
  }, [full, hasHalf]);
  return (
    <div className="flex items-center gap-0.5 text-yellow-400">
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
      className={`w-4 h-4 ${cls}`}
      aria-hidden="true"
    >
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.402 8.166L12 18.896l-7.336 3.867 1.402-8.166L.132 9.21l8.2-1.192z" />
      {type === "half" && (
        <rect x="0" y="0" width="12" height="24" fill="white" />
      )}
    </svg>
  );
}
