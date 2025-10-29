"use client";

import Link from "next/link";
import { Fade } from "react-awesome-reveal";

export default function AnnouncementsSection() {
  return (
    <Fade triggerOnce>
      <section className="relative w-[98%] mx-auto mb-10">
        {/* Background e moldura */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 shadow" />
        <div className="relative rounded-3xl overflow-hidden ring-1 ring-emerald-100/60">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(16,185,129,0.10),transparent_70%)]" />

          <div className="relative p-6 md:p-10 text-emerald-900 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Texto e CTAs de Promoção */}
            <div className="space-y-3 order-2 md:order-1">
              <header className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-900">
                  Anuncie seu evento no VemPraCa
                </h2>
                <p className="text-emerald-800/90 text-sm md:text-base">
                  Divulgue sua programação para moradores e turistas, gere mais
                  engajamento e lotação nos seus eventos.
                </p>
              </header>
              <p className="text-emerald-800/90 text-sm md:text-base">
                Também conectamos quem precisa com prestadores locais. Se você
                quer contratar um serviço, nós te ajudamos a encontrar o melhor.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/contato?assunto=anunciar-evento"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/40 transition"
                >
                  Quero anunciar meu evento
                </Link>
                <Link
                  href="/contato?assunto=contratar-servico"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-emerald-900 text-sm font-semibold bg-white hover:bg-white/95 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-300/40 transition"
                >
                  Quero contratar um serviço
                </Link>
              </div>
              <div className="pt-2">
                <Link
                  href="/meu-negocio"
                  className="inline-block text-emerald-800 underline underline-offset-4 hover:text-emerald-900"
                >
                  Cadastrar meu negócio com destaque →
                </Link>
              </div>
            </div>

            {/* Painel ilustrativo/placeholder (sem imagens de eventos específicos) */}
            <div className="order-1 md:order-2">
              <div className="relative h-56 md:h-72 w-full overflow-hidden rounded-2xl ring-1 ring-[#FDEFD6] bg-green-50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-6">
                    <p className="text-lg md:text-xl font-semibold text-emerald-900">
                      Espaço reservado para o seu evento ou serviço
                    </p>
                    <p className="text-sm text-emerald-800/90 mt-1">
                      Destaque-se na página inicial do VemPraCa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fade>
  );
}
