// d:\Documentos\programação\hotel-portal\src\app\api\pagseguro\coupons\route.js
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_COUPONS_API_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/coupons'
  : 'https://api.assinaturas.pagseguro.com/coupons'; // Verifique a URL de produção

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

// --- CRIAR CUPOM ---
export async function POST(request) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (cupons) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar se o usuário é admin para criar cupons

    const couponData = await request.json();

    // Validações básicas (name, discount, duration são obrigatórios pela doc)
    if (!couponData.name || !couponData.discount || !couponData.duration) {
      return NextResponse.json({ error: 'Nome, desconto e duração são obrigatórios para criar o cupom.' }, { status: 400 });
    }
    if (couponData.redemption_limit && parseInt(couponData.redemption_limit, 10) < 1) {
        return NextResponse.json({ error: 'Limite de resgate (redemption_limit) deve ser maior que 0.' }, { status: 400 });
    }


    const idempotencyKey = uuidv4();
    const requestBody = {
      reference_id: couponData.reference_id || `VMPC_COUPON_${couponData.name.replace(/\s+/g, '_').toUpperCase()}_${Date.now()}`,
      name: couponData.name,
      description: couponData.description,
      discount: couponData.discount, // Ex: { "type": "PERCENTAGE", "value": 10.00 } ou { "type": "FIXED", "value": 500 } (centavos)
      status: couponData.status ? couponData.status.toUpperCase() : 'ACTIVE',
      duration: couponData.duration, // Ex: { "type": "REPEATING", "occurrences": 3 } ou { "type": "FOREVER" }
    };

    if (couponData.redemption_limit) {
      requestBody.redemption_limit = parseInt(couponData.redemption_limit, 10);
    }
    if (couponData.exp_at) { // Formato YYYY-MM-DD
      requestBody.exp_at = couponData.exp_at;
    }

    console.log('[PagBank Create Coupon] Enviando para PagBank:', JSON.stringify(requestBody, null, 2));

    const pagBankResponse = await fetch(PAGSEGURO_COUPONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await pagBankResponse.json();
    console.log('[PagBank Create Coupon] Resposta do PagBank:', JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao criar cupom [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: 'Falha ao criar cupom no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // TODO: Salvar dados do cupom no seu DB se necessário

    return NextResponse.json({
      message: 'Cupom criado com sucesso no PagBank!',
      couponDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao criar cupom PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao criar cupom.', details: error.message }, { status: 500 });
  }
}

// --- LISTAR CUPONS OU CONSULTAR CUPOM POR ID ---
export async function GET(request) {
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (cupons) indisponível.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const couponIdFromQuery = searchParams.get('id'); // Para consulta por ID específico

    let targetUrl = PAGSEGURO_COUPONS_API_URL;
    let logMessageAction = '[PagBank List Coupons] Listando cupons.';

    if (couponIdFromQuery) {
      targetUrl = `${PAGSEGURO_COUPONS_API_URL}/${couponIdFromQuery}`;
      logMessageAction = `[PagBank Get Coupon] Consultando cupom ID: ${couponIdFromQuery}.`;
    } else {
      const offset = searchParams.get('offset');
      const limit = searchParams.get('limit');
      const reference_id_filter = searchParams.get('reference_id');

      const queryParameters = new URLSearchParams();
      if (offset) queryParameters.append('offset', offset);
      if (limit) queryParameters.append('limit', limit);
      if (reference_id_filter) queryParameters.append('reference_id', reference_id_filter);

      if (queryParameters.toString()) {
        targetUrl = `${PAGSEGURO_COUPONS_API_URL}?${queryParameters.toString()}`;
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
    console.log(`[PagBank Coupons GET] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      const actionDescription = couponIdFromQuery ? `consultar cupom ${couponIdFromQuery}` : 'listar cupons';
      console.error(`Erro da API PagBank ao ${actionDescription} [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao ${actionDescription} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    const successMessage = couponIdFromQuery
      ? `Detalhes do cupom ${couponIdFromQuery} recuperados com sucesso!`
      : 'Cupons listados com sucesso!';

    return NextResponse.json({
      message: successMessage,
      data: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao consultar cupons PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao consultar cupons.', details: error.message }, { status: 500 });
  }
}
