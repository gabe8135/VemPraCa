// src/app/api/eventos/festa-caicara/settings/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// Observação: Autenticação via Bearer token enviado pelo cliente (Supabase access_token)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "app_settings"; // chave-valor: { key: text pk, value: jsonb, updated_at }
const KEY = "festanca_visibility";

function getClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || // precisa escrever
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // leitura pode usar anon
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

// GET: retorna { mode, start, end, updated_at }
export async function GET() {
  try {
    const supabase = getClient();
    const fallback = {
      mode: "auto",
      start: "2025-10-24T00:00:00-03:00",
      end: "2025-10-28T00:00:00-03:00",
    };
    if (!supabase) {
      const serverNow = new Date().toISOString();
      return NextResponse.json({ ...fallback, updated_at: null, serverNow });
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select("key, value, updated_at")
      .eq("key", KEY)
      .maybeSingle();
    if (error) throw error;
    const value = data?.value || null;
    const serverNow = new Date().toISOString();
    return NextResponse.json({
      ...fallback,
      ...(value || {}),
      updated_at: data?.updated_at || null,
      serverNow,
    });
  } catch (err) {
    console.error("Erro GET settings festanca:", err);
    // Em erro, retorna fallback para não quebrar o app (dev)
    const serverNow = new Date().toISOString();
    return NextResponse.json({
      mode: "auto",
      start: "2025-10-24T00:00:00-03:00",
      end: "2025-10-28T00:00:00-03:00",
      updated_at: null,
      serverNow,
    });
  }
}

// POST: body { mode: 'auto'|'on'|'off', start?: ISO, end?: ISO }
export async function POST(request) {
  try {
    const supabase = getClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase não configurado" },
        { status: 500 }
      );
    }

    // 1) Ler token do usuário do header Authorization: Bearer <token>
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    const token = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2) Validar token e obter user.id usando cliente anon com header Authorization
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: "Supabase não configurado (anon)" },
        { status: 500 }
      );
    }
    const supaAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, detectSessionInUrl: false },
    });
    const { data: auth } = await supaAnon.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 3) Verificar profile.role usando o cliente autenticado (respeita RLS)
    let roleRec = null;
    const { data: prof, error: profErr } = await supaAnon
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) {
      console.warn(
        "profiles via token falhou, tentando service role:",
        profErr?.message || profErr
      );
    } else if (prof) {
      roleRec = prof;
    }
    if (!roleRec) {
      // Fallback com service role (se disponível)
      try {
        const { data: profSrv, error: srvErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (srvErr) {
          console.error("Erro lendo profile (service role):", srvErr);
        } else {
          roleRec = profSrv;
        }
      } catch (e) {
        console.error("Exceção no fallback service role:", e);
      }
    }
    if (!roleRec) {
      return NextResponse.json(
        { error: "Falha ao validar perfil" },
        { status: 500 }
      );
    }
    if (roleRec.role !== "admin") {
      return NextResponse.json({ error: "Apenas admin" }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const mode = ["auto", "on", "off"].includes(body.mode) ? body.mode : "auto";
    const start = body.start || "2025-10-24T00:00:00-03:00";
    const end = body.end || "2025-10-28T00:00:00-03:00";
    const value = { mode, start, end };

    // upsert na tabela app_settings: tenta primeiro com o cliente autenticado (RLS)
    let upsertOk = false;
    let lastErr = null;
    try {
      const { error: upErr1 } = await supaAnon
        .from(TABLE)
        .upsert({ key: KEY, value }, { onConflict: "key" });
      if (!upErr1) upsertOk = true;
      else lastErr = upErr1;
    } catch (e) {
      lastErr = e;
    }
    if (!upsertOk) {
      // fallback: tentar com service role/supabase key, se disponível
      try {
        const { error: upErr2 } = await supabase
          .from(TABLE)
          .upsert({ key: KEY, value }, { onConflict: "key" });
        if (!upErr2) upsertOk = true;
        else lastErr = upErr2;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!upsertOk) {
      const keySource = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "service_role"
        : process.env.SUPABASE_KEY
          ? "supabase_key"
          : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? "anon"
            : "none";
      console.error("Erro ao salvar settings:", lastErr);
      return NextResponse.json(
        {
          error: "Falha ao salvar settings (verifique RLS e service role)",
          diag: { keySource },
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, value });
  } catch (err) {
    console.error("Erro POST settings festanca:", err);
    return NextResponse.json(
      { error: "Falha ao salvar settings" },
      { status: 500 }
    );
  }
}
