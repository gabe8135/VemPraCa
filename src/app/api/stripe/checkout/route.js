import { NextResponse } from "next/server";
import Stripe from "stripe";

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

    const { planType, negocioId } = await req.json();
    if (!planType || !negocioId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: planType e negocioId." },
        { status: 400 }
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
      success_url: `${BASE_URL}/meu-negocio?subscription=success&negocioId=${encodeURIComponent(negocioId)}`,
      cancel_url: `${BASE_URL}/pagamento-assinatura?negocioId=${encodeURIComponent(negocioId)}&canceled=1`,
      metadata: { negocioId },
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
