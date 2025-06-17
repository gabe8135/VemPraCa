// d:\Documentos\programação\hotel-portal\src\app\api\pagseguro\payments\[payment_id]\refunds\route.js
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_PAYMENTS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/payments'
  : 'https://api.assinaturas.pagseguro.com/payments';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

// POST para criar estorno
export async function POST(request, { params }) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (criar estorno) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar permissão do usuário para criar estorno

    const { payment_id } = params;
    if (!payment_id) {
      return NextResponse.json({ error: 'O ID do pagamento é obrigatório para criar estorno.' }, { status: 400 });
    }

    // A API de estorno total não requer 'amount' no corpo, mas pode aceitar um corpo vazio ou com amount opcional.
    // Por enquanto, vamos assumir estorno total sem corpo, conforme a simplicidade da documentação.
    // Se 'amount' for necessário para estorno total, o frontend precisaria enviar.
    // const bodyData = await request.json().catch(() => ({})); // Tenta ler o corpo, default para {} se vazio/inválido

    const idempotencyKey = uuidv4();
    const createRefundUrl = `${PAGSEGURO_PAYMENTS_API_BASE_URL}/${payment_id}/refunds`;

    console.log(`[PagBank Create Refund] Criando estorno para pagamento ID: ${payment_id}. URL: ${createRefundUrl}`);

    const pagBankResponse = await fetch(createRefundUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Mesmo sem corpo, é bom manter
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
      // body: JSON.stringify(bodyData), // Enviar corpo se a API exigir (ex: para amount)
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Create Refund] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao criar estorno [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao criar estorno para o pagamento ${payment_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // TODO: Atualizar status do pagamento/fatura no seu DB

    return NextResponse.json({
      message: `Estorno para o pagamento ${payment_id} solicitado com sucesso!`,
      refundDetailsPagBank: responseData, // PagBank retorna detalhes do estorno criado
    });

  } catch (error) {
    console.error('Erro interno do servidor ao criar estorno PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao criar estorno.', details: error.message }, { status: 500 });
  }
}

// GET para listar estornos de um pagamento
export async function GET(request, { params }) {
    const supabase = createServerActionClient({ cookies });

    if (!PAGSEGURO_AUTH_TOKEN) {
        console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
        return NextResponse.json({ error: 'Configuração de pagamento (listar estornos) indisponível.' }, { status: 500 });
    }

    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
        return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
        }
        // TODO: Verificar permissão do usuário

        const { payment_id } = params;
        if (!payment_id) {
        return NextResponse.json({ error: 'O ID do pagamento é obrigatório para listar estornos.' }, { status: 400 });
        }

        const listRefundsUrl = `${PAGSEGURO_PAYMENTS_API_BASE_URL}/${payment_id}/refunds`;
        console.log(`[PagBank List Payment Refunds] Listando estornos para pagamento ID: ${payment_id}. URL: ${listRefundsUrl}`);

        const pagBankResponse = await fetch(listRefundsUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
            },
        });

        const responseData = await pagBankResponse.json();
        console.log(`[PagBank List Payment Refunds] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

        if (!pagBankResponse.ok) {
            console.error(`Erro da API PagBank ao listar estornos do pagamento [${pagBankResponse.status}]:`, responseData);
            return NextResponse.json({
                error: `Falha ao listar estornos para o pagamento ${payment_id}.`,
                details: responseData.error_messages || responseData.message || responseData
            }, { status: pagBankResponse.status });
        }

        return NextResponse.json({
            message: `Estornos para o pagamento ${payment_id} listados com sucesso!`,
            refunds: responseData,
        });

    } catch (error) {
        console.error('Erro interno do servidor ao listar estornos do pagamento PagBank:', error);
        return NextResponse.json({ error: 'Erro interno no servidor ao listar estornos do pagamento.', details: error.message }, { status: 500 });
    }
}
