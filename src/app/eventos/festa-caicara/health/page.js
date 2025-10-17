// src/app/eventos/festa-caicara/health/page.js
"use client";
import { useEffect, useState } from "react";

export default function FestaHealthPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/eventos/festa-caicara/health")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || r.statusText);
        setData(j);
      })
      .catch((e) => setError(String(e.message || e)));
  }, []);

  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Diagnóstico Festança Caiçara</h1>
      {error && <p className="text-red-600 mb-4">Erro: {error}</p>}
      <pre className="bg-gray-100 p-4 rounded-xl overflow-auto text-sm">
        {JSON.stringify(data, null, 2) || "Carregando..."}
      </pre>
      <p className="text-sm text-gray-500 mt-4">
        Esta página consulta a API em{" "}
        <code>/api/eventos/festa-caicara/health</code> e exibe o que o servidor
        está enxergando (envs, host, tabelas).
      </p>
    </section>
  );
}
