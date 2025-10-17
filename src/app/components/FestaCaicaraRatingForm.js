"use client";

import { useState } from "react";
import StarRating from "@/app/components/StarRating";

export default function FestaCaicaraRatingForm({ estandeSlug, onSuccess }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nota < 1 || nota > 5) {
      setMsg({ type: "error", text: "Selecione de 1 a 5 estrelas." });
      return;
    }

    setLoading(true);
    setMsg({ type: "loading", text: "Enviando sua avaliação..." });

    try {
      const res = await fetch("/api/eventos/festa-caicara/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estande_slug: estandeSlug,
          nota,
          comentario,
          nome,
          email,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok) {
        const detail =
          data?.error || res.statusText || "Erro ao enviar avaliação";
        throw new Error(`${detail} (HTTP ${res.status})`);
      }

      setMsg({ type: "success", text: "Avaliação enviada com sucesso! 🌊" });
      setLoading(false);
      if (onSuccess) onSuccess();
      // Abre modal de agradecimento; redireciona somente quando usuário clicar em OK
      setShowModal(true);
    } catch (err) {
      setLoading(false);
      setMsg({ type: "error", text: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <StarRating value={nota} onChange={setNota} />
      </div>

      <div>
        <label className="block text-sm font-medium text-emerald-700">
          Comentário (opcional)
        </label>
        <textarea
          className="mt-1 w-full rounded-xl border border-emerald-200 p-3 text-black focus:ring-emerald-500 focus:border-emerald-500"
          maxLength={300}
          rows={4}
          placeholder="Conte como foi sua experiência..."
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 text-right">
          {comentario.length}/300
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            Seu nome (opcional)
          </label>
          <input
            type="text"
            className="mt-1 w-full rounded-xl border border-emerald-200 p-3 text-black focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Ex: Maria Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            Email (opcional)
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-emerald-200 p-3 text-black focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || nota === 0}
        className="w-full inline-flex justify-center items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-white font-semibold shadow hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar Avaliação"}
      </button>

      {msg && (
        <p
          className={`text-center text-sm ${msg.type === "error" ? "text-red-600" : msg.type === "success" ? "text-emerald-700" : "text-gray-600"}`}
        >
          {msg.text}
        </p>
      )}

      <p className="text-xs text-gray-500 text-center">
        (Opcional) Deixe seu nome se quiser que o estande veja quem avaliou.
      </p>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl">
              ✓
            </div>
            <h3 className="text-lg font-bold text-emerald-700">Obrigado!</h3>
            <p className="mt-1 text-sm text-gray-700">
              Sua avaliação foi registrada com sucesso.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
