// d:\Documentos\programação\hotel-portal\src\app\api\pagseguro\invoices\[invoice_id]\route.js
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

// A API de faturas é um endpoint diferente da API de assinaturas base
const PAGSEGURO_INVOICES_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/invoices'
  : 'https://api.assinaturas.pagseguro.com/invoices';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function GET(request, { params }) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (consultar fatura) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar permissão do usuário para ver esta fatura

    const { invoice_id } = params;
    if (!invoice_id) {
      return NextResponse.json({ error: 'O ID da fatura é obrigatório para consulta.' }, { status: 400 });
    }

    const getInvoiceUrl = `${PAGSEGURO_INVOICES_API_BASE_URL}/${invoice_id}`;

    console.log(`[PagBank Get Invoice] Consultando fatura ID: ${invoice_id}. URL: ${getInvoiceUrl}`);

    const pagBankResponse = await fetch(getInvoiceUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Get Invoice] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao consultar fatura [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao consultar fatura ${invoice_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: `Detalhes da fatura ${invoice_id} recuperados com sucesso!`,
      invoiceDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao consultar fatura PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao consultar fatura.', details: error.message }, { status: 500 });
  }
}
