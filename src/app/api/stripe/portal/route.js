import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Cria uma sessão do Customer Portal da Stripe para o cliente do negócio.
// POST body: { negocioId: string }
export async function POST(req) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const BASE_URL =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    if (!secretKey) {
      return NextResponse.json(
        { error: "Configuração ausente: STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    // Autenticação via Supabase JWT
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl || "", supabaseAnon || "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const { negocioId } = await req.json();
    if (!negocioId) {
      return NextResponse.json(
        { error: "Campo obrigatório: negocioId" },
        { status: 400 }
      );
    }

    // Verifica propriedade do negócio e pega stripe_customer_id
    const { data: negocio, error: negErr } = await supabase
      .from("negocios")
      .select("id, usuario_id, stripe_customer_id")
      .eq("id", negocioId)
      .single();
    if (negErr || !negocio) {
      return NextResponse.json(
        { error: "Negócio não encontrado." },
        { status: 404 }
      );
    }
    if (negocio.usuario_id !== user.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para este negócio." },
        { status: 403 }
      );
    }
    if (!negocio.stripe_customer_id) {
      return NextResponse.json(
        { error: "Cliente Stripe não vinculado a este negócio." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: negocio.stripe_customer_id,
      return_url: `${BASE_URL}/meus-negocios`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("/api/stripe/portal error", err);
    return NextResponse.json(
      { error: "Falha ao criar sessão do portal." },
      { status: 500 }
    );
  }
}
