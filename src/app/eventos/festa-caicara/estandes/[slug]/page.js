// src/app/eventos/festa-caicara/estandes/[slug]/page.js
import Link from "next/link";
import FestaCaicaraRatingForm from "@/app/components/FestaCaicaraRatingForm";
import ScanPing from "@/app/components/ScanPing";
import { getStandBySlug } from "@/data/festaCaicaraStands";
import EventStandReviews from "@/app/components/EventStandReviews";
import EventVisibilityGate from "@/app/components/EventVisibilityGate";

export async function generateMetadata({ params }) {
  const p = await params;
  const raw = p?.slug;
  const slug = typeof raw === "string" ? safeDecode(raw) : raw;
  const stand = getStandBySlug(slug);
  return {
    title: stand
      ? `${stand.nome} | Avaliação | Festança Caiçara`
      : "Estande | Festança Caiçara",
    description: stand
      ? `Avalie o estande ${stand.nome} na Festança Caiçara.`
      : "Avalie o estande na Festança Caiçara.",
  };
}

export default async function StandRatingPage({ params }) {
  const p = await params;
  const raw = p?.slug;
  const slug = typeof raw === "string" ? safeDecode(raw) : raw;
  const stand = getStandBySlug(slug);
  if (!stand) {
    return (
      <section className="container mx-auto mt-20 px-4 py-8">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Estande não encontrado
          </h1>
          <p className="text-gray-600 mt-2">
            Verifique o QR Code ou navegue pela lista de estandes.
          </p>
          <Link
            href="/eventos/festa-caicara/estandes"
            className="inline-flex mt-4 rounded-full bg-emerald-600 px-5 py-3 text-white"
          >
            Voltar aos estandes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <ScanPing estandeSlug={stand.slug} />
        <header className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-emerald-700">
            {stand.nome}
          </h1>
          {stand.proprietario && (
            <p className="text-sm text-gray-600 mt-1">
              Proprietário: {stand.proprietario}
            </p>
          )}
          <p className="text-gray-600 mt-2">{stand.descricao}</p>
          {stand.pratoPrincipal && (
            <p className="text-emerald-700 font-medium mt-2">
              Prato principal: {stand.pratoPrincipal}
            </p>
          )}
          {Array.isArray(stand.itens) && stand.itens.length > 0 && (
            <ul className="mt-2 text-gray-700 list-disc list-inside space-y-1 text-left">
              {stand.itens.map((it, idx) => (
                <li key={idx}>{it}</li>
              ))}
            </ul>
          )}
        </header>

        <EventVisibilityGate
          fallback={
            <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-6 text-center text-gray-600">
              As avaliações estarão disponíveis apenas durante a IX Festança
              Caiçara (24 a 27 de outubro).
            </div>
          }
        >
          <div className="bg-white rounded-2xl ring-1 ring-emerald-100 p-5">
            <FestaCaicaraRatingForm estandeSlug={stand.slug} />
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-emerald-700 mb-2">
              Avaliações recentes
            </h2>
            <EventStandReviews slug={stand.slug} />
          </div>
        </EventVisibilityGate>

        <div className="mt-6 text-center">
          <Link
            href="/eventos/festa-caicara/estandes"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
          >
            Ver todos os estandes
          </Link>
        </div>
      </div>
    </section>
  );
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
