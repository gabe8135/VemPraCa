import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Variáveis de ambiente para o token da API de Assinaturas
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_PLANS_API_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/plans'
  : 'https://api.assinaturas.pagseguro.com/plans'; // Verifique a URL de produção correta para planos

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function POST(request) {
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (planos) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (e verificar se é admin, se necessário) - TEMPORARIAMENTE COMENTADO PARA TESTES VIA POSTMAN
    // const { data: { user }, error: userError } = await supabase.auth.getUser();
    // if (userError || !user) {
    //   return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    // }
    // TODO: Adicionar verificação se o usuário é admin, se a criação de planos for restrita
    // ATENÇÃO: A verificação de usuário foi temporariamente comentada. Proteger adequadamente antes de produção.

    // 3. Obter dados da requisição do frontend para criar o plano
    const {
      reference_id, // Opcional, seu identificador interno
      name,           // Obrigatório
      description,    // Opcional
      amount_value,   // Obrigatório: valor em centavos (ex: 5990 para R$59,90)
      amount_currency = 'BRL', // Default BRL
      setup_fee,      // Opcional: taxa de adesão em centavos
      interval_unit,  // Obrigatório: 'DAYS', 'MONTHS', 'YEARS'
      interval_length,// Obrigatório: número (ex: 1 para unit 'MONTHS' = mensal)
      billing_cycles, // Opcional: quantidade de ciclos até expirar
      trial_enabled = false,
      trial_days,     // Obrigatório se trial_enabled = true
      trial_hold_setup_fee = false,
      limit_subscriptions, // Opcional
      payment_methods = ['CREDIT_CARD'], // Default CREDIT_CARD
      editable = true, // Default true
    } = await request.json();

    // 4. Validações básicas dos dados do plano
    if (!name || !amount_value || !interval_unit || !interval_length) {
      return NextResponse.json({ error: 'Dados obrigatórios para criação do plano incompletos (nome, valor, unidade e tamanho do intervalo).' }, { status: 400 });
    }
    if (trial_enabled && !trial_days) {
        return NextResponse.json({ error: 'Para trial habilitado, a quantidade de dias de trial é obrigatória.' }, { status: 400 });
    }

    // 5. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 6. Montar o corpo da requisição para a API de Planos do PagBank
    const requestBody = {
      reference_id: reference_id || `VEMPRACA_PLAN_${name.replace(/\s+/g, '_').toUpperCase()}_${Date.now()}`,
      name,
      description,
      amount: {
        value: parseInt(amount_value, 10), // Garantir que é um inteiro
        currency: amount_currency,
      },
      interval: {
        unit: interval_unit.toUpperCase(), // Ex: MONTHS
        length: parseInt(interval_length, 10),
      },
      payment_method: payment_methods,
      editable,
    };

    if (setup_fee) {
      requestBody.amount.setup_fee = parseInt(setup_fee, 10);
    }
    if (billing_cycles) {
      requestBody.interval.billing_cycles = parseInt(billing_cycles, 10);
    }
    if (trial_enabled) {
      requestBody.trial = {
        enabled: true,
        days: parseInt(trial_days, 10),
        hold_setup_fee: trial_hold_setup_fee,
      };
    }
    if (limit_subscriptions) {
      requestBody.limit_subscriptions = parseInt(limit_subscriptions, 10);
    }

    // 7. Fazer a requisição para a API de Planos do PagBank
    console.log('[PagBank Create Plan] Enviando para PagBank:', JSON.stringify(requestBody, null, 2));

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
    console.log('[PagBank Create Plan] Resposta do PagBank:', JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Planos PagBank [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: 'Falha ao criar plano no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 8. Sucesso! Retornar os dados do plano criado
    // O ID do plano estará em responseData.id
    // Você pode querer salvar os detalhes do plano no seu banco de dados aqui.
    // Ex: await supabase.from('seus_planos_internos').insert({ pagbank_plan_id: responseData.id, ... });

    return NextResponse.json({
      message: 'Plano criado com sucesso no PagBank!',
      planDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao criar plano PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  // 1. Validar token de autenticação da API de Assinaturas
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

    // A API do PagBank espera o plan_id como parte da URL
    const planSpecificUrl = `${PAGSEGURO_PLANS_API_URL}/${plan_id}`;

    console.log(`[PagBank Get Plan] Consultando plano ID: ${plan_id} na URL: ${planSpecificUrl}`);

    const pagBankResponse = await fetch(planSpecificUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Get Plan] Resposta do PagBank para o plano ${plan_id}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Planos PagBank ao consultar plano [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao consultar plano ${plan_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // Sucesso! Retornar os dados do plano consultado.
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

  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (planos) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (e verificar se é admin, se necessário)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Adicionar verificação se o usuário é admin, se a alteração de planos for restrita

    // 3. Obter plan_id dos parâmetros da URL
    const { searchParams } = new URL(request.url);
    const plan_id_to_update = searchParams.get('id');

    if (!plan_id_to_update) {
      return NextResponse.json({ error: 'O parâmetro "id" do plano é obrigatório para atualização.' }, { status: 400 });
    }

    // 4. Obter dados da requisição do frontend para atualizar o plano
    const updateData = await request.json();

    // A documentação do PagBank indica que reference_id, name, e description são obrigatórios no corpo da requisição PUT.
    // Outros campos são opcionais e só serão enviados se presentes em `updateData`.
    if (!updateData.reference_id || !updateData.name || !updateData.description) {
      return NextResponse.json({ error: 'Os campos reference_id, name e description são obrigatórios para atualizar o plano.' }, { status: 400 });
    }

    // 5. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 6. Montar o corpo da requisição para a API de Planos do PagBank
    // Inclui os campos obrigatórios e quaisquer outros campos opcionais fornecidos em updateData.
    const requestBodyPagBank = {
      reference_id: updateData.reference_id,
      name: updateData.name,
      description: updateData.description,
    };

    if (updateData.status) requestBodyPagBank.status = updateData.status.toUpperCase(); // ACTIVE ou INACTIVE
    if (updateData.amount_value) {
      requestBodyPagBank.amount = {
        ...(requestBodyPagBank.amount || {}), // Preserva outros sub-campos de amount se existirem
        value: parseInt(updateData.amount_value, 10),
        currency: updateData.amount_currency || 'BRL', // Adiciona currency se amount_value for fornecido
      };
    }
    if (updateData.setup_fee !== undefined) { // Permite enviar 0 ou remover
      requestBodyPagBank.amount = requestBodyPagBank.amount || { currency: 'BRL' }; // Garante que amount exista
      requestBodyPagBank.amount.setup_fee = updateData.setup_fee === null ? undefined : parseInt(updateData.setup_fee, 10);
    }
    if (updateData.interval_length && updateData.interval_unit) { // Intervalo requer ambos
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
    if (updateData.limit_subscriptions !== undefined) requestBodyPagBank.limit_subscriptions = updateData.limit_subscriptions === null ? undefined : parseInt(updateData.limit_subscriptions, 10); // Corrigido para limit_subscriptions
    if (updateData.payment_methods) requestBodyPagBank.payment_method = updateData.payment_methods;

    // 7. Fazer a requisição para a API de Planos do PagBank
    const planUpdateUrl = `${PAGSEGURO_PLANS_API_URL}/${plan_id_to_update}`;
    console.log(`[PagBank Update Plan] Enviando para PagBank URL: ${planUpdateUrl}`, JSON.stringify(requestBodyPagBank, null, 2));

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
    console.log(`[PagBank Update Plan] Resposta do PagBank para o plano ${plan_id_to_update}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Planos PagBank ao atualizar plano [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({ error: `Falha ao atualizar plano ${plan_id_to_update} no PagBank.`, details: responseData.error_messages || responseData.message || responseData }, { status: pagBankResponse.status });
    }

    return NextResponse.json({ message: `Plano ${plan_id_to_update} atualizado com sucesso no PagBank!`, planDetailsPagBank: responseData });

  } catch (error) {
    console.error('Erro interno do servidor ao atualizar plano PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao atualizar plano.', details: error.message }, { status: 500 });
  }
}
