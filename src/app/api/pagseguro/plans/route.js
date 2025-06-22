import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_PLANS_API_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/plans'
  : 'https://api.assinaturas.pagseguro.com/plans';

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function POST(request) {
  // const supabase = createServerActionClient({ cookies }); // Comentado para teste via Postman

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (planos) indisponível.' }, { status: 500 });
  }

  try {
    // Obter usuário logado (e verificar se é admin) - Comentado para teste via Postman
    // const { data: { user }, error: userError } = await supabase.auth.getUser();
    // if (userError || !user) {
    //   return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    // }

    const {
      reference_id,
      name,
      description,
      amount_value,
      amount_currency = 'BRL',
      setup_fee,
      interval_unit,
      interval_length,
      billing_cycles,
      trial_enabled = false,
      trial_days,
      trial_hold_setup_fee = false,
      limit_subscriptions,
      payment_methods = ['CREDIT_CARD'],
      editable = true,
    } = await request.json();

    // Validações básicas
    if (!name || !amount_value || !interval_unit || !interval_length) {
      return NextResponse.json({ error: 'Dados obrigatórios para criação do plano incompletos (nome, valor, unidade e tamanho do intervalo).' }, { status: 400 });
    }
    if (trial_enabled && !trial_days) {
        return NextResponse.json({ error: 'Para trial habilitado, a quantidade de dias de trial é obrigatória.' }, { status: 400 });
    }

    const idempotencyKey = uuidv4();

    // Montar corpo da requisição
    const requestBody = {
      reference_id: reference_id || `VEMPRACA_PLAN_${name.replace(/\s+/g, '_').toUpperCase()}_${Date.now()}`,
      name,
      description,
      amount: {
        value: parseInt(amount_value, 10),
        currency: amount_currency,
      },
      interval: {
        unit: interval_unit.toUpperCase(),
        length: parseInt(interval_length, 10),
      },
      payment_method: payment_methods,
      editable,
    };

    if (setup_fee) requestBody.amount.setup_fee = parseInt(setup_fee, 10);
    if (billing_cycles) requestBody.interval.billing_cycles = parseInt(billing_cycles, 10);
    if (trial_enabled) {
      requestBody.trial = {
        enabled: true,
        days: parseInt(trial_days, 10),
        hold_setup_fee: trial_hold_setup_fee,
      };
    }
    if (limit_subscriptions) requestBody.limit_subscriptions = parseInt(limit_subscriptions, 10);

    console.log('Enviando para PagBank:', JSON.stringify(requestBody, null, 2));

    const pagBankResponse = await fetch(PAGSEGURO_PLANS_API_URL, {
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
    console.log('Resposta do PagBank:', JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      return NextResponse.json({
        error: 'Falha ao criar plano no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: 'Plano criado com sucesso no PagBank!',
      planDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao criar plano PagBank:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.', details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (planos) indisponível.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const plan_id = searchParams.get('id');

    if (!plan_id) {
      return NextResponse.json({ error: 'O parâmetro "id" do plano é obrigatório para consulta.' }, { status: 400 });
    }

    const planSpecificUrl = `${PAGSEGURO_PLANS_API_URL}/${plan_id}`;

    console.log(`Consultando plano ID: ${plan_id} na URL: ${planSpecificUrl}`);

    const pagBankResponse = await fetch(planSpecificUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`Resposta do PagBank para o plano ${plan_id}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      return NextResponse.json({
        error: `Falha ao consultar plano ${plan_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    return NextResponse.json({
      message: `Detalhes do plano ${plan_id} recuperados com sucesso!`,
      planDetails: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao consultar plano PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao consultar plano.', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const supabase = createServerActionClient({ cookies });

  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (planos) indisponível.' }, { status: 500 });
  }

  try {
    // Obter usuário logado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const plan_id_to_update = searchParams.get('id');

    if (!plan_id_to_update) {
      return NextResponse.json({ error: 'O parâmetro "id" do plano é obrigatório para atualização.' }, { status: 400 });
    }

    const updateData = await request.json();

    if (!updateData.reference_id || !updateData.name || !updateData.description) {
      return NextResponse.json({ error: 'Os campos reference_id, name e description são obrigatórios para atualizar o plano.' }, { status: 400 });
    }

    const idempotencyKey = uuidv4();

    const requestBodyPagBank = {
      reference_id: updateData.reference_id,
      name: updateData.name,
      description: updateData.description,
    };

    if (updateData.status) requestBodyPagBank.status = updateData.status.toUpperCase(); // ACTIVE ou INACTIVE
    if (updateData.amount_value) {
      requestBodyPagBank.amount = {
        ...(requestBodyPagBank.amount || {}),
        value: parseInt(updateData.amount_value, 10),
        currency: updateData.amount_currency || 'BRL',
      };
    }
    if (updateData.setup_fee !== undefined) {
      requestBodyPagBank.amount = requestBodyPagBank.amount || { currency: 'BRL' };
      requestBodyPagBank.amount.setup_fee = updateData.setup_fee === null ? undefined : parseInt(updateData.setup_fee, 10);
    }
    if (updateData.interval_length && updateData.interval_unit) {
        requestBodyPagBank.interval = {
            ...(requestBodyPagBank.interval || {}),
            length: parseInt(updateData.interval_length, 10),
            unit: updateData.interval_unit.toUpperCase(),
        };
    }
    if (updateData.billing_cycles !== undefined) {
        requestBodyPagBank.interval = requestBodyPagBank.interval || {};
        requestBodyPagBank.interval.billing_cycles = updateData.billing_cycles === null ? undefined : parseInt(updateData.billing_cycles, 10);
    }
    if (updateData.trial_enabled !== undefined && updateData.trial_days !== undefined) {
        requestBodyPagBank.trial = {
            enabled: updateData.trial_enabled,
            days: parseInt(updateData.trial_days, 10),
            hold_setup_fee: updateData.trial_hold_setup_fee !== undefined ? updateData.trial_hold_setup_fee : false,
        };
    }
    if (updateData.limit_subscriptions !== undefined) requestBodyPagBank.limit_subscriptions = updateData.limit_subscriptions === null ? undefined : parseInt(updateData.limit_subscriptions, 10);
    if (updateData.payment_methods) requestBodyPagBank.payment_method = updateData.payment_methods;

    const planUpdateUrl = `${PAGSEGURO_PLANS_API_URL}/${plan_id_to_update}`;
    console.log(`Atualizando plano: ${planUpdateUrl}`, JSON.stringify(requestBodyPagBank, null, 2));

    const pagBankResponse = await fetch(planUpdateUrl, {
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
    console.log(`Resposta do PagBank para o plano ${plan_id_to_update}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      return NextResponse.json({ error: `Falha ao atualizar plano ${plan_id_to_update} no PagBank.`, details: responseData.error_messages || responseData.message || responseData }, { status: pagBankResponse.status });
    }

    return NextResponse.json({ message: `Plano ${plan_id_to_update} atualizado com sucesso no PagBank!`, planDetailsPagBank: responseData });

  } catch (error) {
    console.error('Erro interno do servidor ao atualizar plano PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', details: error.message }, { status: 500 });
  }
}
