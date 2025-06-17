// d:\Documentos\programação\hotel-portal\src\app\api\pagseguro\preferences\retries\route.js
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

// A API de preferências de retentativas é um endpoint específico
const PAGSEGURO_RETRIES_PREFERENCES_API_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/preferences/retries'
  : 'https://api.assinaturas.pagseguro.com/preferences/retries';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

// GET para consultar as preferências de retentativa
export async function GET(request) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (retentativas) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar se o usuário é admin para consultar/alterar preferências da conta

    console.log(`[PagBank Get Retry Preferences] Consultando preferências de retentativa. URL: ${PAGSEGURO_RETRIES_PREFERENCES_API_URL}`);

    const pagBankResponse = await fetch(PAGSEGURO_RETRIES_PREFERENCES_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Get Retry Preferences] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao consultar preferências de retentativa [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: 'Falha ao consultar preferências de retentativa no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: 'Preferências de retentativa recuperadas com sucesso!',
      retryPreferences: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao consultar preferências de retentativa PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao consultar preferências de retentativa.', details: error.message }, { status: 500 });
  }
}

// PUT para alterar as preferências de retentativa
export async function PUT(request) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (retentativas) indisponível.' }, { status: 500 });
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar se o usuário é admin para alterar preferências da conta

    const bodyData = await request.json();
    // A API espera first_try, second_try, third_try, finally
    if (!bodyData.first_try || !bodyData.second_try || !bodyData.third_try || !bodyData.finally) {
        return NextResponse.json({ error: 'Todos os campos de configuração de retentativa (first_try, second_try, third_try, finally) são obrigatórios.' }, { status: 400 });
    }
    if (!['CANCEL', 'SUSPEND'].includes(bodyData.finally.toUpperCase())) {
        return NextResponse.json({ error: 'O campo "finally" deve ser "CANCEL" ou "SUSPEND".' }, { status: 400 });
    }


    const idempotencyKey = uuidv4();
    const requestBodyPagBank = {
        first_try: bodyData.first_try, // ex: "D+1"
        second_try: bodyData.second_try, // ex: "D+3"
        third_try: bodyData.third_try, // ex: "D+5"
        finally: bodyData.finally.toUpperCase(), // "CANCEL" ou "SUSPEND"
    };

    console.log(`[PagBank Update Retry Preferences] Alterando preferências de retentativa. URL: ${PAGSEGURO_RETRIES_PREFERENCES_API_URL}`);
    console.log(`[PagBank Update Retry Preferences] Enviando corpo:`, JSON.stringify(requestBodyPagBank, null, 2));


    const pagBankResponse = await fetch(PAGSEGURO_RETRIES_PREFERENCES_API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(requestBodyPagBank),
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Update Retry Preferences] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao alterar preferências de retentativa [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: 'Falha ao alterar preferências de retentativa no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: 'Preferências de retentativa alteradas com sucesso!',
      updatedRetryPreferences: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao alterar preferências de retentativa PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao alterar preferências de retentativa.', details: error.message }, { status: 500 });
  }
}
