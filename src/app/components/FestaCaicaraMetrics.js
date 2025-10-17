"use client";

import { useEffect, useState } from "react";
import { stands } from "@/data/festaCaicaraStands";

export default function FestaCaicaraMetrics() {
  const [stats, setStats] = useState({ total: 0, media: 0, ranking: [] });
  const [scansTotal, setScansTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [resRatings, resScans] = await Promise.all([
          fetch("/api/eventos/festa-caicara/avaliacoes"),
          fetch("/api/eventos/festa-caicara/scans"),
        ]);
        if (resRatings.ok) {
          const ratings = await resRatings.json();
          setStats(ratings);
        }
        if (resScans.ok) {
          const scans = await resScans.json();
          setScansTotal(scans.total || 0);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const mediaFormatted = stats.media ? stats.media.toFixed(2) : "0.00";

  return (
    <div className="mt-6 rounded-2xl ring-1 ring-emerald-100 p-4 bg-white">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-gray-700">
          {loading
            ? "Carregando métricas..."
            : `🔸 Já foram enviadas ${stats.total} avaliações nesta edição.`}
        </p>
        {!loading && (
          <p className="text-emerald-700 font-semibold">
            Média geral: {mediaFormatted} ⭐
          </p>
        )}
      </div>
      {/* Engajamento oculto ao público por solicitação */}
      {!loading && stats.ranking?.length > 0 && (
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Ranking (top 5)
          </h3>
          <ol className="list-decimal pl-5 text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {stats.ranking.slice(0, 5).map((r) => {
              const found = stands.find((s) => s.slug === r.slug);
              const name = found?.nome || r.slug.replaceAll("-", " ");
              return (
                <li key={r.slug}>
                  {name} — {r.media.toFixed(2)} ⭐ ({r.total})
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
