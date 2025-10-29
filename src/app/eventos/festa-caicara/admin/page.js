// src/app/eventos/festa-caicara/admin/page.js
import React from "react";
import FestaCaicaraAdminNav from "@/app/components/FestaCaicaraAdminNav";

export const dynamic = "force-dynamic";

export default function AdminFestancaPage() {
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <FestaCaicaraAdminNav />
      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-6">
        <h1 className="text-xl font-bold text-emerald-700 mb-2">
          Painel encerrado
        </h1>
        <p className="text-sm text-gray-600">
          O painel administrativo desta edição foi arquivado. Use as páginas de
          informações e QR Codes para consultas.
        </p>
      </div>
    </section>
  );
}
