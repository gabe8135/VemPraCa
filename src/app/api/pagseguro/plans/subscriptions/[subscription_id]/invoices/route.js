import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Variáveis de ambiente
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/subscriptions'
  : 'https://api.assinaturas.pagseguro.com/subscriptions';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function GET(request, { params }) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (faturas) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar se o usuário tem permissão para ver faturas desta assinatura

    const { subscription_id } = params;
    if (!subscription_id) {
      return NextResponse.json({ error: 'O ID da assinatura é obrigatório para listar faturas.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Ex: "PAID,UNPAID"
    const offset = searchParams.get('offset');
    const limit = searchParams.get('limit');

    const queryParameters = new URLSearchParams();
    if (status) queryParameters.append('status', status);
    if (offset) queryParameters.append('offset', offset);
    if (limit) queryParameters.append('limit', limit);

    let listInvoicesUrl = `${PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL}/${subscription_id}/invoices`;
    if (queryParameters.toString()) {
      listInvoicesUrl += `?${queryParameters.toString()}`;
    }

    console.log(`[PagBank List Invoices] Listando faturas para assinatura ${subscription_id}. URL: ${listInvoicesUrl}`);

    const pagBankResponse = await fetch(listInvoicesUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank List Invoices] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao listar faturas [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao listar faturas para a assinatura ${subscription_id}.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: 'Faturas listadas com sucesso!',
      invoices: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao listar faturas PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao listar faturas.', details: error.message }, { status: 500 });
  }
}
