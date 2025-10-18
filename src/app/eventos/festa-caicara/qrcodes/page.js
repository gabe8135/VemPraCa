// src/app/eventos/festa-caicara/qrcodes/page.js
import { stands } from "@/data/festaCaicaraStands";
import FestaCaicaraAdminNav from "@/app/components/FestaCaicaraAdminNav";
import AdminGate from "@/app/components/AdminGate";
import { headers } from "next/headers";
import Image from "next/image";

export const dynamic = "force-dynamic";

async function absoluteBase() {
  // Se definido, usa domínio fixo para impressão (ex.: https://www.vempraca.com.br)
  const envBase =
    process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.APP_BASE_URL;
  if (envBase) return String(envBase).replace(/\/$/, "");
  // Caso contrário, deriva do request atual
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

export default async function QRCodesPage() {
  const base = await absoluteBase();
  // Compat alias temporário: garantir que o QR do "Rancho Alegre" funcione em produção
  // Remover após deploy que contenha o slug definitivo.
  const qrAlias = (slug) => (slug === "rancho-alegre" ? "tenda-10" : slug);
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <FestaCaicaraAdminNav />
      <AdminGate redirectOnDenied>
        <h1 className="text-2xl font-bold text-emerald-700 mb-2">
          QR Codes — Festança Caiçara
        </h1>
        <p className="text-sm text-gray-600 mb-4 print:hidden">
          Visualize e imprima os QR Codes prontos para as placas. Cada estande
          tem um QR fixo para sua URL única.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stands.map((s) => {
            const slugForQR = qrAlias(s.slug);
            const url = `${base}/eventos/festa-caicara/estandes/${slugForQR}`;
            return (
              <article
                key={s.slug}
                className="rounded-2xl ring-1 ring-emerald-100 bg-white p-6 flex flex-col items-center text-center"
                style={{ breakInside: "avoid" }}
              >
                {/* Cabeçalho com logo e chamada */}
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src="/favicon.png"
                    alt="VemPraCá"
                    width={40}
                    height={40}
                    className="rounded-md"
                  />
                  <div className="text-left">
                    <h2 className="font-bold text-emerald-700 text-lg">
                      {s.nome}
                    </h2>
                    <p className="text-[11px] text-gray-500 print:hidden">
                      ID: {s.slug}
                    </p>
                  </div>
                </div>

                <p className="text-xl font-extrabold text-emerald-700 leading-tight">
                  VemPraCá e me conta o que você achou!
                </p>

                {/* QR incorporado para impressão */}
                <div className="mt-4">
                  <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=0&data=${encodeURIComponent(url)}`}
                    alt={`QR Code para ${s.nome}`}
                    width={340}
                    height={340}
                    className="mx-auto"
                  />
                </div>

                <p className="mt-3 text-base text-gray-700 font-medium">
                  Avalie este estande rapidinho
                </p>

                {/* URL visível para alternativa manual */}
                <p className="mt-2 text-xs text-gray-500 break-words max-w-full">
                  {url}
                </p>

                {/* Controles apenas no digital */}
                <div className="mt-4 flex flex-col gap-2 print:hidden">
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                  >
                    Abrir QR Code (alta resolução)
                  </a>
                  <a
                    href={url}
                    className="text-xs text-emerald-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir link de destino
                  </a>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-6 text-center text-sm text-gray-500 print:hidden">
          Dica: use Ctrl+P para imprimir estas etiquetas (recomendo bordas sem
          margens e orientação retrato).
        </div>
      </AdminGate>
    </section>
  );
}
