// src/app/eventos/festa-caicara/estandes/qrcodes/page.js
import QRCodeGenerator from "@/app/components/QRCodeGenerator";
import { stands } from "@/data/festaCaicaraStands";

export const metadata = {
  title: "QR Codes dos estandes | Festança Caiçara",
};

export default function QRCodesPage() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold text-emerald-700 text-center mb-6">
          QR Codes dos estandes
        </h1>
        <p className="text-center text-gray-600 mb-4">
          Imprima e fixe em cada barraca. Cada QR direciona para a página de
          avaliação do estande correspondente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stands.map((s) => {
            const url = `${base}/eventos/festa-caicara/estandes/${s.slug}`;
            return (
              <div
                key={s.slug}
                className="bg-white rounded-2xl ring-1 ring-emerald-100 p-4 flex flex-col items-center"
              >
                <h2 className="text-lg font-semibold text-emerald-700 mb-2 text-center">
                  {s.nome}
                </h2>
                <QRCodeGenerator url={url} size={220} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
