"use client";
import React from "react";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabaseClient";

function isWithin(date, startIso, endIso) {
  try {
    const t = new Date(date).getTime();
    const a = new Date(startIso).getTime();
    const b = new Date(endIso).getTime();
    return t >= a && t < b; // end exclusivo
  } catch {
    return false;
  }
}

async function fetchSettings() {
  try {
    // 1) Tenta via Supabase client (padrão do site)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "festanca_visibility")
          .maybeSingle();
        if (!error && data?.value) return data.value;
      } catch {}
    }
    // 2) Fallback: API pública (server)
    try {
      const url =
        typeof window !== "undefined" && window.location
          ? `${window.location.origin}/api/eventos/festa-caicara/settings`
          : "/api/eventos/festa-caicara/settings";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {}
    // 3) Fallback final: defaults
    return {
      mode: "auto",
      start: "2025-10-24T00:00:00-03:00",
      end: "2025-10-28T00:00:00-03:00",
    };
  } catch (e) {
    return {
      mode: "auto",
      start: "2025-10-24T00:00:00-03:00",
      end: "2025-10-28T00:00:00-03:00",
    };
  }
}

export default function FestaCaicaraVisibilityGate({
  children,
  fallback = null,
}) {
  const [state, setState] = React.useState({ loading: true, show: false });

  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      const settings = await fetchSettings();
      const now = new Date();
      let show = false;
      const params = new URLSearchParams(window.location.search);
      // preview=1 pode forçar exibir para testes, somente para admins logados
      let previewAllowed = false;
      if (params.get("preview") === "1" && isSupabaseConfigured) {
        try {
          const { data: auth } = await supabase.auth.getUser();
          const uid = auth?.user?.id;
          if (uid) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", uid)
              .maybeSingle();
            if (prof?.role === "admin") previewAllowed = true;
          }
        } catch {}
      }
      if (previewAllowed) {
        show = true;
      } else if (settings.mode === "on") {
        show = true;
      } else if (settings.mode === "off") {
        show = false;
      } else {
        show = isWithin(now, settings.start, settings.end);
      }
      if (alive) setState({ loading: false, show });
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) return fallback;
  return state.show ? children : fallback;
}
