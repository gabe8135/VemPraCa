"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log detalhado no console para depuração em produção
    try {
      // eslint-disable-next-line no-console
      console.error("GlobalError boundary:", error);
    } catch {}
  }, [error]);

  return (
    <html>
      <body style={{ padding: 24, fontFamily: "system-ui, Arial, sans-serif" }}>
        <h2 style={{ color: "#b91c1c", marginBottom: 12 }}>Ocorreu um erro</h2>
        <p style={{ color: "#111827", marginBottom: 16 }}>
          Houve um problema ao renderizar a aplicação. Tente recarregar a
          página. Se o erro persistir, entre em contato com o suporte.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f9fafb",
            color: "#374151",
            padding: 12,
            borderRadius: 8,
            maxHeight: 240,
            overflow: "auto",
            border: "1px solid #e5e7eb",
          }}
        >
          {String(error?.message || "Erro desconhecido")}
        </pre>
        <button
          onClick={() => reset?.()}
          style={{
            marginTop: 16,
            background: "#059669",
            color: "white",
            border: 0,
            padding: "10px 16px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
