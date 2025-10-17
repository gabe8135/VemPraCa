// src/app/eventos/festa-caicara/qrcodes/page.js
import { stands } from "@/data/festaCaicaraStands";
import FestaCaicaraAdminNav from "@/app/components/FestaCaicaraAdminNav";
import AdminGate from "@/app/components/AdminGate";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function absoluteBase() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export default async function QRCodesPage() {
  const base = await absoluteBase();
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <FestaCaicaraAdminNav />
      <AdminGate redirectOnDenied>
        <h1 className="text-2xl font-bold text-emerald-700 mb-2">
          QR Codes — Festança Caiçara
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Use os links abaixo para gerar os QR codes no navegador. Cada estande
          tem um ID único (slug).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stands.map((s) => {
            const url = `${base}/eventos/festa-caicara/estandes/${s.slug}`;
            return (
              <article
                key={s.slug}
                className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4"
              >
                <h2 className="font-semibold text-emerald-700">{s.nome}</h2>
                <p className="text-xs text-gray-600">ID: {s.slug}</p>
                <p className="text-xs text-gray-600">
                  Proprietário: {s.proprietario || "—"}
                </p>
                <div className="mt-2">
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                  >
                    Abrir QR Code
                  </a>
                </div>
                <div className="mt-2">
                  <a
                    href={url}
                    className="text-xs text-emerald-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Link de destino
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </AdminGate>
    </section>
  );
}
