// src/app/api/eventos/festa-caicara/scans/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stands as localStands } from "@/data/festaCaicaraStands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O cliente será criado dentro das handlers para garantir envs carregadas

const TABLE = "scans_festa_caicara";

export async function POST(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    // Prioriza ANON (mesmo mecanismo do resto do site); cai para service_role se faltar
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      const dev = process.env.NODE_ENV !== "production";
      const diag = dev
        ? {
            hasUrl: Boolean(supabaseUrl),
            hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
            hasKey: Boolean(process.env.SUPABASE_KEY),
            hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          }
        : undefined;
      return NextResponse.json(
        {
          error:
            "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY).",
          diag,
        },
        { status: 500 }
      );
    }
    const supabase = createClient(supabaseUrl || "", supabaseKey || "");
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const estande_slug = body.estande_slug || searchParams.get("estande_slug");
    if (!estande_slug) {
      return NextResponse.json(
        { error: "estande_slug é obrigatório" },
        { status: 400 }
      );
    }
    const ua = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    const { error } = await supabase.from(TABLE).insert({
      estande_slug,
      user_agent: ua.slice(0, 300),
      referer: referer.slice(0, 300),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro POST scans festa caiçara:", err);
    const dev = process.env.NODE_ENV !== "production";
    let urlHost = null;
    try {
      const u =
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      urlHost = u ? new URL(u).hostname : null;
    } catch {}
    return NextResponse.json(
      {
        error: dev ? String(err?.message || err) : "Falha ao registrar scan",
        diag: dev
          ? {
              urlHost,
              keySource: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "anon"
                : process.env.SUPABASE_SERVICE_ROLE_KEY
                  ? "service_role"
                  : process.env.SUPABASE_KEY
                    ? "supabase_key"
                    : "none",
            }
          : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ total: 0, porEstande: {} });
    }
    const supabase = createClient(supabaseUrl || "", supabaseKey || "");
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const wantList = searchParams.get("list");
    const limitParam = parseInt(searchParams.get("limit") || "500", 10);
    const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
    const limit = isNaN(limitParam)
      ? 500
      : Math.max(1, Math.min(2000, limitParam));
    const offset = isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

    // Janela padrão desta edição (fallback 24-27/10/2025)
    let defaultStart = "2025-10-24T00:00:00-03:00";
    let defaultEnd = "2025-10-28T00:00:00-03:00";
    try {
      const { data: sData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "festanca_visibility")
        .maybeSingle();
      if (sData?.value?.start) defaultStart = sData.value.start;
      if (sData?.value?.end) defaultEnd = sData.value.end;
    } catch {}
    const isDev = process.env.NODE_ENV !== "production";
    const effFrom = from || (isDev ? null : defaultStart);
    const effTo = to || (isDev ? null : defaultEnd);

    // Limita aos estandes cadastrados da edição atual (2025)
    let allowedSlugs = null;
    try {
      const { data: slugRows } = await supabase
        .from("estandes_festa_caicara")
        .select("slug")
        .eq("ano", 2025);
      allowedSlugs = (slugRows || []).map((r) => r.slug);
    } catch {}
    if (!Array.isArray(allowedSlugs) || allowedSlugs.length === 0) {
      try {
        allowedSlugs = (localStands || []).map((s) => s.slug);
      } catch {
        allowedSlugs = null;
      }
    }

    let q = supabase
      .from(TABLE)
      .select("id, estande_slug, created_at")
      .order("created_at", { ascending: false });
    if (effFrom) q = q.gte("created_at", effFrom);
    if (effTo) q = q.lte("created_at", effTo);
    if (Array.isArray(allowedSlugs) && allowedSlugs.length)
      q = q.in("estande_slug", allowedSlugs);

    if (wantList) {
      const { data, error, count } = await q
        .range(offset, offset + limit - 1)
        .select("id, estande_slug, created_at", { count: "exact" });
      if (error) throw error;
      return NextResponse.json({
        total: count ?? data.length,
        items: data || [],
      });
    }

    const { data, error } = await q;
    if (error) throw error;
    const total = data.length;
    const porEstande = {};
    for (const r of data) {
      porEstande[r.estande_slug] = (porEstande[r.estande_slug] || 0) + 1;
    }
    return NextResponse.json({ total, porEstande });
  } catch (err) {
    console.error("Erro GET scans festa caiçara:", err);
    return NextResponse.json({ total: 0, porEstande: {} });
  }
}
