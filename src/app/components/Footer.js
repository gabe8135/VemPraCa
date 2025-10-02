"use client";

import Link from "next/link";
import InstallPWAButton from "@/app/components/InstallPWAButton";
import {
  FiPhone,
  FiMail,
  FiMapPin,
  FiInstagram,
  FiFacebook,
  FiLinkedin,
  FiYoutube,
  FiExternalLink,
} from "react-icons/fi";

export default function Footer() {
  const anoCriacao = 2024;
  const anoAtual = new Date().getFullYear();

  // Dados da empresa via variáveis públicas (edite no .env.local)
  const name = process.env.NEXT_PUBLIC_COMPANY_NAME || "VemPraCá";
  const cnpj = process.env.NEXT_PUBLIC_COMPANY_CNPJ || "";
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL || "";
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE || ""; // Ex.: +55 (11) 99999-9999
  const whatsapp = process.env.NEXT_PUBLIC_COMPANY_WHATSAPP || phone; // Fallback para o mesmo número
  const address = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "";
  const city = process.env.NEXT_PUBLIC_COMPANY_CITY || "";
  const uf = process.env.NEXT_PUBLIC_COMPANY_UF || "";
  const mapsUrl = process.env.NEXT_PUBLIC_COMPANY_GOOGLE_MAPS_URL || "";
  const supportHours = process.env.NEXT_PUBLIC_SUPPORT_HOURS || ""; // Ex.: Seg–Sex 09:00–18:00

  // Redes sociais (mostra apenas as existentes)
  const socials = [
    {
      name: "Instagram",
      href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
      icon: FiInstagram,
    },
    {
      name: "Facebook",
      href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
      icon: FiFacebook,
    },
    {
      name: "LinkedIn",
      href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
      icon: FiLinkedin,
    },
    {
      name: "YouTube",
      href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
      icon: FiYoutube,
    },
  ].filter((s) => !!s.href);

  const onlyDigits = (s = "") => s.replace(/\D/g, "");
  const telHref = phone
    ? `tel:${
        onlyDigits(phone).startsWith("55")
          ? "+" + onlyDigits(phone)
          : "+" + onlyDigits("55" + onlyDigits(phone))
      }`
    : "";
  // Link fixo solicitado pelo usuário para WhatsApp
  const waHref = "https://wa.me/5513997399924";

  return (
    <footer className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
      {/* JSON-LD Organization para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name,
            url: process.env.NEXT_PUBLIC_SITE_URL || "https://vembraca.app",
            logo: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/favicon.ico`,
            contactPoint: email
              ? [
                  {
                    "@type": "ContactPoint",
                    email,
                    telephone: phone || undefined,
                    contactType: "customer support",
                    areaServed: "BR",
                    availableLanguage: ["Portuguese", "pt-BR"],
                  },
                ]
              : undefined,
            sameAs: socials.map((s) => s.href),
            address:
              address || city || uf
                ? {
                    "@type": "PostalAddress",
                    streetAddress: address || undefined,
                    addressLocality: city || undefined,
                    addressRegion: uf || undefined,
                    addressCountry: "BR",
                  }
                : undefined,
          }),
        }}
      />
      <div className="container mx-auto px-4 py-10">
        {/* Top: 3-4 colunas */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Marca / Descrição */}
          <div>
            <Link
              href="/"
              className="inline-flex items-baseline gap-1 text-2xl font-semibold tracking-tight"
            >
              <span>{name}</span>
              <span aria-hidden>↗</span>
            </Link>
            <p className="mt-3 text-sm/6 text-emerald-50/90">
              Conectamos pessoas a negócios locais com ofertas, serviços e
              avaliações reais. Descubra o melhor perto de você.
            </p>
            {/* Botão de instalar PWA abaixo da descrição */}
            <div className="mt-4">
              <InstallPWAButton className="inline-flex items-center justify-center rounded-md bg-white text-green-800 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-emerald-50 transition whitespace-nowrap" />
            </div>
            {cnpj && (
              <p className="mt-2 text-xs/6 text-emerald-50/80">CNPJ: {cnpj}</p>
            )}
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-base font-semibold">Contato</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {phone && (
                <li className="flex items-center gap-2">
                  <FiPhone aria-hidden className="shrink-0" />
                  <a
                    href={telHref}
                    className="hover:underline"
                    aria-label={`Ligar para ${name}`}
                  >
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2">
                  <FiMail aria-hidden className="shrink-0" />
                  <a
                    href={`mailto:${email}`}
                    className="hover:underline"
                    aria-label={`Enviar email para ${name}`}
                  >
                    {email}
                  </a>
                </li>
              )}
              {(address || city || uf) && (
                <li className="flex items-start gap-2">
                  <FiMapPin aria-hidden className="mt-0.5 shrink-0" />
                  <div>
                    <p>{[address, city, uf].filter(Boolean).join(", ")}</p>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-100/90 hover:text-white hover:underline mt-0.5"
                        aria-label="Abrir no Google Maps"
                      >
                        Ver no Google Maps <FiExternalLink aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              )}
              {supportHours && (
                <li className="text-emerald-50/90">
                  Atendimento: {supportHours}
                </li>
              )}
              {/* Portfólio (mesmo estilo do botão WhatsApp) */}
              <li>
                <a
                  href="https://synaliz.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-3 py-2 text-sm font-medium ring-1 ring-inset ring-white/20 hover:bg-emerald-500/25"
                  aria-label="Abrir portfólio em nova aba"
                >
                  <FiExternalLink aria-hidden className="h-4 w-4" />
                  Portfólio
                </a>
              </li>
              {waHref && (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-3 py-2 text-sm font-medium ring-1 ring-inset ring-white/20 hover:bg-emerald-500/25"
                    aria-label="Abrir conversa no WhatsApp"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path d="M20.52 3.48A11.91 11.91 0 0 0 12.06 0C5.5 0 .2 5.29.2 11.85c0 2.09.54 4.12 1.58 5.92L0 24l6.42-1.65a11.84 11.84 0 0 0 5.64 1.43h.01c6.56 0 11.85-5.3 11.85-11.86 0-3.17-1.23-6.15-3.45-8.34ZM12.07 21.5h-.01a9.7 9.7 0 0 1-4.95-1.36l-.36-.21-3.81.98 1.02-3.7-.23-.38a9.7 9.7 0 0 1-1.49-5.18C2.24 6.5 6.66 2.1 12.06 2.1c2.67 0 5.17 1.04 7.05 2.92a9.89 9.89 0 0 1 2.07 11.18c-1.6 3.59-5.23 5.3-9.12 5.3Zm5.35-7.26c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.19.29-.76.95-.93 1.15-.17.2-.34.22-.63.08-.29-.15-1.22-.45-2.33-1.45-.86-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.08-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.51h-.57c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.44 0 1.44 1.03 2.83 1.18 3.03.15.19 2.03 3.11 4.92 4.36.69.3 1.23.47 1.65.6.69.22 1.31.19 1.8.12.55-.08 1.74-.71 1.98-1.39.24-.67.24-1.25.17-1.39-.07-.15-.26-.24-.55-.39Z" />
                    </svg>
                    WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Links úteis */}
          <div>
            <h3 className="text-base font-semibold">Links úteis</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:underline">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/como-funciona" className="hover:underline">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link href="/sobre" className="hover:underline">
                  Sobre
                </Link>
              </li>
              <li>
                <Link href="/contato" className="hover:underline">
                  Contato
                </Link>
              </li>
              <li>
                <Link href="/termos-de-uso" className="hover:underline">
                  Termos de uso
                </Link>
              </li>
            </ul>
          </div>

          {/* Siga nas redes */}
          <div>
            <h3 className="text-base font-semibold">Siga nas redes</h3>
            {socials.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-3">
                {socials.map(({ name, href, icon: Icon }) => (
                  <li key={name}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-inset ring-white/15 hover:bg-white/15"
                    >
                      <Icon aria-hidden />
                      <span>{name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-emerald-50/90">
                Em breve novidades nas redes sociais.
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 h-px w-full bg-white/15" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-center text-sm text-emerald-50/90 sm:flex-row">
          <p>
            &copy;{anoCriacao}
            {anoAtual > anoCriacao ? `-${anoAtual}` : ""} {name}↗. Todos os
            direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/termos-de-uso" className="hover:underline">
              Termos de uso
            </Link>
            <span aria-hidden className="opacity-50">
              •
            </span>
            <a
              href="https://maps.google.com/?q=Pedrinhas+Ilha+Comprida+Brasil"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              Brasil
              <FiExternalLink aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
