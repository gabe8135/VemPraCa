import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Cancela a assinatura Stripe de um negócio do usuário autenticado.
// POST body: { negocioId: string, immediate?: boolean }
// Se immediate=true, cancela imediatamente; caso contrário, agenda ao fim do período (cancel_at_period_end=true).
export async function POST(req) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Configuração ausente: STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    // Autenticação do usuário via Supabase JWT
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

    const { negocioId, immediate } = await req.json();
    if (!negocioId) {
      return NextResponse.json(
        { error: "Campo obrigatório: negocioId" },
        { status: 400 }
      );
    }

    // Verifica propriedade do negócio e obtém dados da assinatura
    const { data: negocio, error: negErr } = await supabase
      .from("negocios")
      .select("id, usuario_id, stripe_subscription_id, grandfathered")
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

    const subscriptionId = negocio.stripe_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Nenhuma assinatura ativa vinculada a este negócio." },
        { status: 400 }
      );
    }

    // Executa cancelamento na Stripe
    let stripeResult;
    if (immediate) {
      stripeResult = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      stripeResult = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Visibilidade:
    // - Cancelamento imediato: desativa visibilidade agora (se não for grandfathered).
    // - Cancelar ao fim do período: manter visibilidade até o término. O webhook
    //   customer.subscription.deleted cuidará de desativar no momento correto.
    if (immediate && !negocio.grandfathered) {
      await supabase
        .from("negocios")
        .update({ is_visible: false })
        .eq("id", negocioId);
    }

    // Retorno inclui status Stripe e data de fim, quando aplicável
    return NextResponse.json({
      success: true,
      subscription: {
        id: stripeResult.id,
        status: stripeResult.status,
        cancel_at_period_end: stripeResult.cancel_at_period_end || false,
        current_period_end: stripeResult.current_period_end || null,
      },
      visibility: {
        is_visible: immediate && !negocio.grandfathered ? false : undefined,
      },
      message: immediate
        ? "Assinatura cancelada imediatamente e visibilidade desativada."
        : "Cancelamento agendado ao final do período. Seu negócio permanecerá visível até o término do ciclo.",
    });
  } catch (err) {
    console.error("/api/stripe/subscription/cancel error", err);
    return NextResponse.json(
      { error: "Falha ao cancelar assinatura." },
      { status: 500 }
    );
  }
}
