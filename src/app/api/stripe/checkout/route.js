import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
const priceYearly = process.env.STRIPE_PRICE_YEARLY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function POST(req) {
  try {
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "Configuração ausente: STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

    // Autenticação: valida o usuário via Supabase JWT enviado no header Authorization
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    const { planType, negocioId } = await req.json();
    if (!planType || !negocioId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: planType e negocioId." },
        { status: 400 }
      );
    }

    // Autorização: garante que o negócio pertence ao usuário autenticado
    console.log("DEBUG /api/stripe/checkout");
    console.log("negocioId recebido:", negocioId);
    console.log("user.id:", user.id);
    const {
      data: negocio,
      error: negocioErr,
      status: negocioStatus,
    } = await supabase
      .from("negocios")
      .select("id, usuario_id")
      .eq("id", negocioId)
      .single();
    console.log("Resultado da consulta negocio:", negocio);
    console.log("Erro da consulta negocio:", negocioErr);
    console.log("Status da consulta negocio:", negocioStatus);
    if (negocioErr || !negocio) {
      console.error("Negócio não encontrado ou erro:", negocioErr, negocio);
      return NextResponse.json(
        { error: "Negócio não encontrado." },
        { status: 404 }
      );
    }
    if (negocio.usuario_id !== user.id) {
      console.error("Usuário não é proprietário:", {
        negocioUsuarioId: negocio.usuario_id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Você não tem permissão para este negócio." },
        { status: 403 }
      );
    }

    const priceId = planType === "yearly" ? priceYearly : priceMonthly;
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Defina o ID do preço no .env: ${planType === "yearly" ? "STRIPE_PRICE_YEARLY" : "STRIPE_PRICE_MONTHLY"}`,
        },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Por ora, restringimos a cartão para recorrência estável. Pix pode ser usado via faturas.
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/pagamento-assinatura?success=1&negocioId=${encodeURIComponent(negocioId)}`,
      cancel_url: `${BASE_URL}/pagamento-assinatura?negocioId=${encodeURIComponent(negocioId)}&canceled=1`,
      metadata: { negocioId },
      subscription_data: {
        metadata: { negocioId },
      },
      // Opcional: coletar endereço
      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("/api/stripe/checkout error", err);
    return NextResponse.json(
      { error: "Falha ao criar sessão de checkout." },
      { status: 500 }
    );
  }
}
