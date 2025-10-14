// src/app/eventos/festa-caicara/page.js

import Image from "next/image";
import Link from "next/link";
import ShareButton from "@/app/components/ShareButton";
import { FiHome, FiShare2 } from "react-icons/fi";

export const metadata = {
  title: "IX Festança Caiçara - Programação completa | Vem Pra Cá",
  description:
    "Confira a programação completa da IX Festança Caiçara na Vila de Pedrinhas, Ilha Comprida/SP (24 a 27 de outubro): shows, atividades esportivas e vivências culturais.",
  alternates: {
    canonical: "/eventos/festa-caicara",
  },
  openGraph: {
    title: "IX Festança Caiçara - Programação completa",
    description:
      "Veja atrações e horários da IX Festança Caiçara em Ilha Comprida (Vila de Pedrinhas).",
    images: [
      {
        url: "/event/festa-caicara.webp",
        width: 800,
        height: 1000,
        alt: "Cartaz da IX Festança Caiçara",
      },
    ],
  },
};

export default function FestaCaicaraPage() {
  const programacao = [
    {
      dia: "Sexta 24/10",
      itens: [
        "17h – Procissão - Nossa Senhora da Conceição",
        "19h – Abertura da Vila",
        "20h – SHOW - Daniel e Jorge Lucca",
        "22h30 – SHOW - Nativos da Ilha",
      ],
    },
    {
      dia: "Sábado 25/10",
      itens: [
        "07h – PROGRAMAÇÃO ESPORTIVA: HAKA",
        "12h – Abertura da Vila",
        "12h30 – SHOW - Janelas e Beirais",
        "14h – SHOW - Fandango",
        "15h – SHOW - ONG Crescer para o Futuro",
        "16h – SHOW - Nave de Orion",
        "18h30 – SHOW - Edu Zeidan",
        "20h30 – SHOW - Banda Sempre Festa",
        "22h30 – SHOW - Banda Peixe Elétrico",
      ],
    },
    {
      dia: "Domingo 26/10",
      itens: [
        "10h – PROGRAMAÇÃO ESPORTIVA: ENCONTRO CAIÇARA DE CANOAGEM",
        "12h – Abertura da Vila",
        "13h – SHOW - Clavadinho",
        "14h – CORRIDA DE CANOA CAIÇARA",
        "15h – SHOW - Lella",
        "16h – VIVÊNCIA CULTURAL - CASA DE COSTUMES",
        "18h30 – SHOW - Presença A+",
        "20h30 – SHOW - Packaw",
        "22h30 – SHOW - Yasmin Farias",
      ],
    },
    {
      dia: "Segunda 27/10",
      itens: [
        "09h – SESSÃO SOLENE",
        "11h – Abertura da Vila",
        "13h – SHOW - Clave de Samba",
        "15h30 – SHOW - James Banda",
      ],
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "IX Festança Caiçara",
    description:
      "Programação oficial da IX Festança Caiçara na Vila de Pedrinhas, Ilha Comprida/SP.",
    location: {
      "@type": "Place",
      name: "Vila de Pedrinhas",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Ilha Comprida",
        addressRegion: "SP",
        addressCountry: "BR",
      },
    },
    image: [
      `${process.env.NEXT_PUBLIC_SITE_URL || ""}/event/festa-caicara.webp`,
    ],
    startDate: "2025-10-24",
    endDate: "2025-10-27",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };

  const canonicalUrl =
    (process.env.NEXT_PUBLIC_SITE_URL || "") + "/eventos/festa-caicara";

  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-700">
            IX Festança Caiçara – Programação Completa
          </h1>
          <p className="text-gray-600 mt-2">
            24 a 27 de outubro – Vila de Pedrinhas, Ilha Comprida/SP
          </p>
        </header>

        <div className="rounded-2xl overflow-hidden ring-1 ring-emerald-100 mb-6">
          <Image
            src="/event/caicara.webp"
            alt="Cartaz da IX Festança Caiçara"
            width={1200}
            height={1600}
            className="w-full h-auto"
            priority
          />
        </div>

        <div className="space-y-6">
          {programacao.map((bloco) => (
            <div
              key={bloco.dia}
              className="bg-white rounded-2xl ring-1 ring-emerald-100 p-5"
            >
              <h2 className="text-xl font-bold text-emerald-700 mb-2">
                {bloco.dia}
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-gray-800">
                {bloco.itens.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <ShareButton
            url={canonicalUrl}
            title="Compartilhar"
            text="Confira a programação da IX Festança Caiçara em Ilha Comprida"
            icon={<FiShare2 className="h-5 w-5" aria-hidden />}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
          />
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50 font-semibold shadow-sm"
          >
            <FiHome className="h-5 w-5" aria-hidden />
            Voltar para a home
          </Link>
        </div>
      </div>
    </section>
  );
}
