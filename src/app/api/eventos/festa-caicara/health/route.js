// src/app/api/eventos/festa-caicara/health/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE_RATINGS = "avaliacoes_festa_caicara";
const TABLE_SCANS = "scans_festa_caicara";

export async function GET() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY;

  const diag = {
    hasUrl: Boolean(supabaseUrl),
    hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasKey: Boolean(process.env.SUPABASE_KEY),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    keySource: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "anon"
      : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role"
        : process.env.SUPABASE_KEY
          ? "supabase_key"
          : "none",
    urlHost: null,
  };
  try {
    diag.urlHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;
  } catch {}

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase não configurado", diag },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Não usar head:true para garantir erros legíveis e contagem
    const ratingsRes = await supabase
      .from(TABLE_RATINGS)
      .select("id", { count: "exact" })
      .limit(1);
    const scansRes = await supabase
      .from(TABLE_SCANS)
      .select("id", { count: "exact" })
      .limit(1);

    const serializeErr = (e) => {
      if (!e) return null;
      // PostgrestError normalmente tem message/details/hint/code strings
      const safe = {
        message:
          typeof e.message === "string" ? e.message : JSON.stringify(e.message),
        code: e.code ?? null,
        details:
          typeof e.details === "string"
            ? e.details
            : e.details
              ? JSON.stringify(e.details)
              : null,
        hint:
          typeof e.hint === "string"
            ? e.hint
            : e.hint
              ? JSON.stringify(e.hint)
              : null,
      };
      try {
        // Informação crua como fallback
        return { ...safe, raw: JSON.parse(JSON.stringify(e)) };
      } catch {
        return safe;
      }
    };

    const result = {
      ok: true,
      diag,
      ratings: {
        count:
          ratingsRes.count ?? (ratingsRes.data ? ratingsRes.data.length : null),
        error: serializeErr(ratingsRes.error),
      },
      scans: {
        count: scansRes.count ?? (scansRes.data ? scansRes.data.length : null),
        error: serializeErr(scansRes.error),
      },
    };
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err), diag },
      { status: 500 }
    );
  }
}
