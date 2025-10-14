"use client";

import Link from "next/link";
import Image from "next/image";
import { Fade } from "react-awesome-reveal";

export default function AnnouncementsSection() {
  return (
    <Fade triggerOnce>
      <section className="relative w-[98%] mx-auto mb-10">
        {/* Background e moldura */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-600 via-emerald-700 to-emerald-800 shadow" />
        <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.06),transparent_80%)]" />

          <div className="relative p-6 md:p-8 text-white grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Banner do evento */}
            <div className="md:col-span-1">
              <Link
                href="/eventos/festa-caicara"
                className="block rounded-2xl overflow-hidden ring-1 ring-white/15 hover:ring-white/30 transition"
              >
                <Image
                  src="/event/festa-caicara.webp"
                  alt="Programação da IX Festança Caiçara em Vila de Pedrinhas, Ilha Comprida"
                  width={800}
                  height={1000}
                  className="h-auto w-full object-cover"
                  priority
                />
              </Link>
            </div>

            {/* Texto e CTA */}
            <div className="md:col-span-2 space-y-3">
              <header>
                <h2 className="text-2xl font-extrabold text-white">
                  IX Festança Caiçara — Vila de Pedrinhas, Ilha Comprida/SP
                </h2>
                <p className="mt-1 text-sm text-white/85">
                  24 a 27 de outubro — Shows, programação esportiva, vivências
                  culturais e muito mais.
                </p>
              </header>
              <p className="text-sm text-emerald-50/95">
                Veja a programação completa do evento com horários e atrações.
                Compartilhe com seus amigos e não perca nada!
              </p>
              <div className="pt-2">
                <Link
                  href="/eventos/festa-caicara"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/30 transition"
                >
                  Ver programação completa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Fade>
  );
}
