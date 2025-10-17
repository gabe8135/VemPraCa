// src/app/api/eventos/festa-caicara/avaliacoes/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stands as localStands } from "@/data/festaCaicaraStands";

// Garante ambiente Node e evita caching agressivo no App Router
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tabela dedicada para avaliações do evento
const TABLE = "avaliacoes_festa_caicara";

export async function POST(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    // Prioriza ANON (já funcional no site) e cai para service_role se necessário
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

    // Verifica settings de visibilidade: bloqueia envio fora da janela
    const { data: sData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "festanca_visibility")
      .maybeSingle();
    const settings = sData?.value || {
      mode: "auto",
      start: "2025-10-24T00:00:00-03:00",
      end: "2025-10-28T00:00:00-03:00",
    };
    const now = new Date();
    const within =
      now >= new Date(settings.start) && now < new Date(settings.end);
    let allowed =
      settings.mode === "on" || (settings.mode === "auto" && within);
    // Em desenvolvimento, não bloquear envio para facilitar testes locais
    const isDev = process.env.NODE_ENV !== "production";
    if (!allowed && isDev) allowed = true;
    // Override manual opcional: ?override=1
    try {
      const { searchParams } = new URL(request.url);
      if (!allowed && searchParams.get("override") === "1") allowed = true;
    } catch {}
    if (!allowed) {
      return NextResponse.json(
        { error: "Avaliações fechadas no momento." },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { estande_slug, nota, comentario, nome, email } = body || {};

    if (!estande_slug || !nota || Number.isNaN(Number(nota))) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const emailNorm = (email || "").trim();
    const nomeNorm = (nome || "").trim();
    const comentarioNorm = (comentario || "").trim();

    const payload = {
      estande_slug,
      nota: Math.max(0, Math.min(5, Number(nota))),
      comentario: comentarioNorm ? comentarioNorm.slice(0, 300) : null,
      nome_comentario: nomeNorm ? nomeNorm.slice(0, 120) : null,
      email_comentario: emailNorm ? emailNorm.slice(0, 160) : null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select("id, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (err) {
    console.error("Erro POST avaliacoes festa caiçara:", err);
    const dev = process.env.NODE_ENV !== "production";
    let urlHost = null;
    try {
      const u =
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      urlHost = u ? new URL(u).hostname : null;
    } catch {}
    return NextResponse.json(
      {
        error: dev ? String(err?.message || err) : "Falha ao salvar avaliação",
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

// GET ?estande_slug=... para métricas do estande
// GET sem params retorna métricas agregadas do evento
export async function GET(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY;
    const { searchParams } = new URL(request.url);
  const estande = searchParams.get("estande_slug");
  const wantList = searchParams.get("list");
  const limitParam = parseInt(searchParams.get("limit") || "20", 10);
  const offsetParam = parseInt(searchParams.get("offset") || "0", 10);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const notaMinParam = searchParams.get("notaMin");
    const notaMin = notaMinParam != null ? parseFloat(notaMinParam) : null;
    const limit = isNaN(limitParam)
      ? 20
      : Math.max(1, Math.min(100, limitParam));
    const offset = isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

    if (!supabaseUrl || !supabaseKey) {
      if (wantList) return NextResponse.json({ total: 0, items: [] });
      if (estande) return NextResponse.json({ total: 0, media: 0 });
      return NextResponse.json({ total: 0, media: 0, ranking: [] });
    }
    const supabase = createClient(supabaseUrl || "", supabaseKey || "");

    // Janela padrão desta edição (fallback para 24-27/10/2025) caso não venha filtro
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

    // Novo: listagem de avaliações reais (respeita janela por padrão)
    if (wantList) {
      let q = supabase
        .from(TABLE)
        .select(
          "id, estande_slug, nota, comentario, nome_comentario, email_comentario, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (estande) q = q.eq("estande_slug", estande);
      if (Array.isArray(allowedSlugs) && allowedSlugs.length)
        q = q.in("estande_slug", allowedSlugs);
  if (effFrom) q = q.gte("created_at", effFrom);
  if (effTo) q = q.lte("created_at", effTo);
      if (notaMin != null && !Number.isNaN(notaMin)) q = q.gte("nota", notaMin);

      const { data, count, error } = await q;
      if (error) throw error;
      // Opcional: mascarar email
      const items = (data || []).map((r) => ({
        id: r.id,
        estande_slug: r.estande_slug,
        nota: r.nota,
        comentario: r.comentario,
        nome: r.nome_comentario || null,
        email: r.email_comentario || null,
        created_at: r.created_at,
      }));
      return NextResponse.json({ total: count ?? items.length, items });
    }

    if (estande) {
      if (Array.isArray(allowedSlugs) && allowedSlugs.length && !allowedSlugs.includes(estande)) {
        // Estande não pertence à edição atual
        return NextResponse.json({ total: 0, media: 0 });
      }
      // Métricas por estande
      let q = supabase.from(TABLE).select("nota, created_at").eq("estande_slug", estande);
  if (effFrom) q = q.gte("created_at", effFrom);
  if (effTo) q = q.lte("created_at", effTo);
      const { data, error } = await q;
      if (error) throw error;

      const total = data.length;
      const soma = data.reduce((acc, r) => acc + (r.nota || 0), 0);
      const media = total ? soma / total : 0;
      return NextResponse.json({ total, media });
    }

    // Métricas gerais
    let q = supabase.from(TABLE).select("estande_slug, nota, created_at");
  if (effFrom) q = q.gte("created_at", effFrom);
  if (effTo) q = q.lte("created_at", effTo);
    if (Array.isArray(allowedSlugs) && allowedSlugs.length)
      q = q.in("estande_slug", allowedSlugs);
    const { data, error } = await q;
    if (error) throw error;

    const total = data.length;
    const soma = data.reduce((acc, r) => acc + (r.nota || 0), 0);
    const media = total ? soma / total : 0;
    const porEstande = {};
    for (const r of data) {
      porEstande[r.estande_slug] ||= { total: 0, soma: 0 };
      porEstande[r.estande_slug].total += 1;
      porEstande[r.estande_slug].soma += r.nota || 0;
    }
    const ranking = Object.entries(porEstande)
      .map(([slug, { total, soma }]) => ({
        slug,
        total,
        media: total ? soma / total : 0,
      }))
      .sort((a, b) => b.media - a.media);

    return NextResponse.json({ total, media, ranking });
  } catch (err) {
    console.error("Erro GET avaliacoes festa caiçara:", err);
    // Degrada gracioso: não expor erro na página pública
    try {
      const { searchParams } = new URL(request.url);
      const wantList = searchParams.get("list");
      const estande = searchParams.get("estande_slug");
      if (wantList) return NextResponse.json({ total: 0, items: [] });
      if (estande) return NextResponse.json({ total: 0, media: 0 });
    } catch {}
    return NextResponse.json({ total: 0, media: 0, ranking: [] });
  }
}
