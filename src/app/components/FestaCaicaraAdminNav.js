"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FestaCaicaraAdminNav() {
  const pathname = usePathname();
  const items = [
    { href: "/eventos/festa-caicara/admin", label: "Métricas" },
    { href: "/eventos/festa-caicara/qrcodes", label: "QR Codes" },
    { href: "/eventos/festa-caicara/info", label: "Info (Gráficos)" },
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ring-1 transition ${
              active
                ? "bg-emerald-600 text-white ring-emerald-600"
                : "bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
