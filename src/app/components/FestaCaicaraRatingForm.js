"use client";
import { useState } from "react";

export default function FestaCaicaraRatingForm({ estandeSlug, onSuccess }) {
  const [nota, setNota] = useState(5);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!estandeSlug) return;
    setLoading(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/eventos/festa-caicara/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estande_slug: estandeSlug,
          nota,
          nome,
          email,
          comentario,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Falha ao enviar avaliação");
      setOk(true);
      setComentario("");
      if (onSuccess) onSuccess(j);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-emerald-700">
          Sua nota
        </label>
        <select
          value={nota}
          onChange={(e) => setNota(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            Nome (opcional)
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            Email (opcional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-emerald-700">
          Comentário (opcional)
        </label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && (
        <p className="text-sm text-emerald-700">
          Obrigado! Sua avaliação foi registrada.
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-emerald-600 px-5 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
