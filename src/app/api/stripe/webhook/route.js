import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

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
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        let negocioId = session.metadata?.negocioId || null;
        if (!negocioId && subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          negocioId = sub?.metadata?.negocioId || null;
        }
        if (negocioId) {
          await supabaseAdmin
            .from("negocios")
            .update({
              is_visible: true,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
            })
              async function updateVisibilitySafe({ negocioId, visible, subscriptionId, customerId }) {
                if (!negocioId) return;
                const { data: negocio } = await supabaseAdmin
                  .from("negocios")
                  .select("id, grandfathered, stripe_subscription_id")
                  .eq("id", negocioId)
                  .single();
                if (!negocio) return;
                if (negocio.grandfathered) {
                  // Negócio antigo gratuito: não alterar visibilidade automaticamente
                  return;
                }
                if (subscriptionId && negocio.stripe_subscription_id && negocio.stripe_subscription_id !== subscriptionId) {
                  // Evita alterar outro negócio por engano
                  return;
                }
                const updatePayload = { is_visible: Boolean(visible) };
                if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId;
                if (customerId) updatePayload.stripe_customer_id = customerId;
                await supabaseAdmin.from("negocios").update(updatePayload).eq("id", negocioId);
              }

            .eq("id", negocioId);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscription.status;
        const negocioId = subscription.metadata?.negocioId;
        if (negocioId) {
          const visible = ["active", "trialing"].includes(status);
                  await updateVisibilitySafe({ negocioId, visible: true, subscriptionId, customerId });
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const negocioId = subscription.metadata?.negocioId;
        if (negocioId) {
          await supabaseAdmin
                  const visible = ["active", "trialing"].includes(status);
                  await updateVisibilitySafe({ negocioId, visible, subscriptionId: subscription.id });
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const negocioId = sub?.metadata?.negocioId;
          if (negocioId) {
                  await updateVisibilitySafe({ negocioId, visible: false, subscriptionId: subscription.id });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          const negocioId = sub?.metadata?.negocioId;
                    await updateVisibilitySafe({ negocioId, visible: true, subscriptionId: sub?.id });
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
                    await updateVisibilitySafe({ negocioId, visible: false, subscriptionId: sub?.id });
}
