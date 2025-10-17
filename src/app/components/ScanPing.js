"use client";

import { useEffect } from "react";

export default function ScanPing({ estandeSlug }) {
  useEffect(() => {
    if (!estandeSlug) return;
    fetch("/api/eventos/festa-caicara/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estande_slug: estandeSlug }),
    }).catch(() => {});
  }, [estandeSlug]);

  return null;
}
