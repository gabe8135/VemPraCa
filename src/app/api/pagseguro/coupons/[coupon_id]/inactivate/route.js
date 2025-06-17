import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_COUPONS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/coupons'
  : 'https://api.assinaturas.pagseguro.com/coupons';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function PUT(request, { params }) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (inativar cupom) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar permissão do usuário para inativar este cupom

    const { coupon_id } = params;
    if (!coupon_id) {
      return NextResponse.json({ error: 'O ID do cupom é obrigatório para inativação.' }, { status: 400 });
    }

    const idempotencyKey = uuidv4();
    const inactivateCouponUrl = `${PAGSEGURO_COUPONS_API_BASE_URL}/${coupon_id}/inactivate`;

    console.log(`[PagBank Inactivate Coupon] Inativando cupom ID: ${coupon_id}. URL: ${inactivateCouponUrl}`);

    const pagBankResponse = await fetch(inactivateCouponUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Inactivate Coupon] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao inativar cupom [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao inativar cupom ${coupon_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // TODO: Atualizar status do cupom no seu DB se necessário

    return NextResponse.json({
      message: `Cupom ${coupon_id} inativado com sucesso!`,
      couponDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao inativar cupom PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao inativar cupom.', details: error.message }, { status: 500 });
  }
}
