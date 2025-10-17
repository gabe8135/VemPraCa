// src/app/eventos/festa-caicara/admin/page.js
import React, { Suspense } from "react";
import FestaCaicaraAdminNav from "@/app/components/FestaCaicaraAdminNav";
import ClientAdminPage from "./ClientAdminPage";

export const dynamic = "force-dynamic";

export default function AdminFestancaPage() {
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <FestaCaicaraAdminNav />
      <Suspense fallback={<p className="text-sm text-gray-500">Carregando…</p>}>
        <ClientAdminPage />
      </Suspense>
    </section>
  );
}
