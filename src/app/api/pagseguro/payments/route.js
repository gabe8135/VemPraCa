// d:\Documentos\programação\hotel-portal\src\app\api\pagseguro\payments\route.js
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

// URLs base distintas para diferentes operações de pagamento
const PAGSEGURO_INVOICES_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/invoices'
  : 'https://api.assinaturas.pagseguro.com/invoices';

const PAGSEGURO_PAYMENTS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/payments'
  : 'https://api.assinaturas.pagseguro.com/payments';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function GET(request) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (pagamentos) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    // Autenticação pode ser opcional para listagem geral se for endpoint de admin
    // if (!user) return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const invoice_id = searchParams.get('invoice_id'); // Para listar pagamentos de uma fatura
    const payment_id_query = searchParams.get('id'); // Para consultar um pagamento específico

    let targetUrl;
    let logMessageAction;

    if (payment_id_query) {
      // Consultar um pagamento específico
      targetUrl = `${PAGSEGURO_PAYMENTS_API_BASE_URL}/${payment_id_query}`;
      logMessageAction = `[PagBank Get Payment] Consultando pagamento ID: ${payment_id_query}.`;
    } else if (invoice_id) {
      // Listar pagamentos de uma fatura específica
      targetUrl = `${PAGSEGURO_INVOICES_API_BASE_URL}/${invoice_id}/payments`;
      logMessageAction = `[PagBank List Invoice Payments] Listando pagamentos para fatura ID: ${invoice_id}.`;
    } else {
      // Listar todos os pagamentos (com filtros)
      targetUrl = PAGSEGURO_PAYMENTS_API_BASE_URL;
      logMessageAction = '[PagBank List Payments] Listando todos os pagamentos.';

      const queryParameters = new URLSearchParams();
      const offset = searchParams.get('offset');
      const limit = searchParams.get('limit');
      const status = searchParams.get('status');
      const created_at_start = searchParams.get('created_at_start');
      const created_at_end = searchParams.get('created_at_end');
      const payment_method_type = searchParams.get('payment_method_type');
      const q_filter = searchParams.get('q');

      if (offset) queryParameters.append('offset', offset);
      if (limit) queryParameters.append('limit', limit);
      if (status) queryParameters.append('status', status);
      if (created_at_start) queryParameters.append('created_at_start', created_at_start);
      if (created_at_end) queryParameters.append('created_at_end', created_at_end);
      if (payment_method_type) queryParameters.append('payment_method_type', payment_method_type);
      if (q_filter) queryParameters.append('q', q_filter);

      if (queryParameters.toString()) {
        targetUrl += `?${queryParameters.toString()}`;
      }
    }

    console.log(`${logMessageAction} URL: ${targetUrl}`);

    const pagBankResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Payments GET] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha na operação de pagamentos no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: 'Operação de pagamentos realizada com sucesso!',
      data: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor em pagamentos PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor em pagamentos.', details: error.message }, { status: 500 });
  }
}
