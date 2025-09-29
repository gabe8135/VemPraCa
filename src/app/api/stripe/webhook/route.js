import { NextResponse } from "next/server";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !secretKey) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET/STRIPE_SECRET_KEY ausentes" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed.", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // TODO: marcar assinatura como ativa no seu banco (Supabase) com session.subscription, session.customer, metadata.negocioId
        break;
      }
      case "invoice.payment_succeeded": {
        // TODO: renovar período e status
        break;
      }
      case "customer.subscription.deleted": {
        // TODO: marcar como cancelada
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("/api/stripe/webhook handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
