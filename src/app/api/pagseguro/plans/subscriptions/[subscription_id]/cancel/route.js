// d:\Documentos\programação\hotel-portal\src\app\api\pagseguro\subscriptions\[subscription_id]\cancel\route.js
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/subscriptions'
  : 'https://api.assinaturas.pagseguro.com/subscriptions';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function PUT(request, { params }) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (cancelar assinatura) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar permissão do usuário para cancelar esta assinatura

    const { subscription_id } = params;
    if (!subscription_id) {
      return NextResponse.json({ error: 'O ID da assinatura é obrigatório para cancelamento.' }, { status: 400 });
    }

    const idempotencyKey = uuidv4();
    const cancelSubscriptionUrl = `${PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL}/${subscription_id}/cancel`;

    console.log(`[PagBank Cancel Subscription] Cancelando assinatura ID: ${subscription_id}. URL: ${cancelSubscriptionUrl}`);

    const pagBankResponse = await fetch(cancelSubscriptionUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
      // Este endpoint PUT não requer corpo (body)
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Cancel Subscription] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao cancelar assinatura [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao cancelar assinatura ${subscription_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // TODO: Atualizar o status da assinatura no seu banco de dados (Supabase) para 'CANCELADA'
    // Ex: await supabase.from('negocio_assinaturas').update({ status_assinatura: 'CANCELADA', data_cancelamento: new Date().toISOString() }).eq('pagseguro_subscription_id', subscription_id);


    return NextResponse.json({
      message: `Assinatura ${subscription_id} cancelada com sucesso!`,
      subscriptionDetailsPagBank: responseData, // PagBank geralmente retorna o objeto da assinatura atualizado
    });

  } catch (error) {
    console.error('Erro interno do servidor ao cancelar assinatura PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao cancelar assinatura.', details: error.message }, { status: 500 });
  }
}
