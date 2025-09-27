"use client";

import Link from "next/link";
import { Fade } from "react-awesome-reveal";
import { FiVolume2 } from "react-icons/fi";

export default function AnnouncementsSection() {
  return (
    <Fade triggerOnce>
      <section className="relative w-[98%] mx-auto mb-10">
        {/* Fundo suave com a paleta do app */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 shadow" />
        <div className="relative rounded-3xl overflow-hidden ring-1 ring-emerald-100/60">
          {/* realce sutil em verde para balancear o amarelo */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(16,185,129,0.06),transparent_80%)]" />
          <div className="relative p-6 md:p-8 flex flex-col gap-5 text-emerald-900">
            <header className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl">
                <FiVolume2 size={28} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  Em breve: Eventos e Anúncios
                </h2>
                <p className="mt-1 text-sm text-amber-800/80">
                  Um espaço para divulgar shows, feiras, convenções, promoções
                  locais e muito mais.
                </p>
              </div>
            </header>

            <ul className="text-sm text-emerald-800/90 list-disc pl-6">
              <li>Destaques da agenda cultural e de negócios da região</li>
              <li>Campanhas e oportunidades das empresas locais</li>
              <li>Chamadas para inscrições, cupons e vagas em eventos</li>
            </ul>

            <div className="pt-2 mt-1 border-t border-emerald-100/70">
              <Link
                href="/contato"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/30 transition"
              >
                Quer anunciar aqui?
              </Link>
              <span className="ml-3 text-xs text-amber-700/80">
                Entre em contato!
              </span>
            </div>
          </div>
        </div>
      </section>
    </Fade>
  );
}
