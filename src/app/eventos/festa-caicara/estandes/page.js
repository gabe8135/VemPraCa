// src/app/eventos/festa-caicara/estandes/page.js
import { stands } from "@/data/festaCaicaraStands";
import EventStandGrid from "@/app/components/EventStandGrid";
import EventVisibilityGate from "@/app/components/EventVisibilityGate";
import Link from "next/link";

export const metadata = {
  title: "Estandes gastronômicos | Festança Caiçara | Vem Pra Cá",
  description:
    "Avalie os estandes gastronômicos da Festança Caiçara. Deixe sua nota e comentário.",
};

export default function EstandesListPage() {
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-700">
            Estandes gastronômicos
          </h1>
          <p className="text-gray-600 mt-2">
            Avalie cada estande e ajude a melhorar a experiência da Festança
            Caiçara.
          </p>
        </header>

        <EventVisibilityGate
          fallback={
            <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-6 text-center text-gray-600">
              <p>
                As avaliações e a lista de estandes estarão disponíveis apenas
                durante a IX Festança Caiçara (24 a 27 de outubro).
              </p>
              <div className="mt-4">
                <Link
                  href="/eventos/festa-caicara"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                >
                  Voltar para a programação
                </Link>
              </div>
            </div>
          }
        >
          <EventStandGrid stands={stands} />
        </EventVisibilityGate>
      </div>
    </section>
  );
}
