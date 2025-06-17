import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Variáveis de ambiente para o token da API de Assinaturas
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/subscriptions'
  : 'https://api.assinaturas.pagseguro.com/subscriptions'; // Verifique a URL de produção correta

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function GET(request, { params }) {
  // O { params } virá do Next.js com os parâmetros da rota dinâmica
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (assinaturas) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (opcional, para verificar permissões se necessário)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Adicionar verificação se o usuário tem permissão para ver esta assinatura

    // 3. Obter subscription_id dos parâmetros da rota
    const { subscription_id } = params; // Extrai 'subscription_id' do objeto params

    if (!subscription_id) {
      return NextResponse.json({ error: 'O ID da assinatura é obrigatório para consulta.' }, { status: 400 });
    }

    // 4. Montar a URL para consultar a assinatura
    const getSubscriptionUrl = `${PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL}/${subscription_id}`;

    console.log(`[PagBank Get Subscription] Consultando assinatura ID: ${subscription_id} na URL: ${getSubscriptionUrl}`);

    // 5. Fazer a requisição para a API do PagBank
    const pagBankResponse = await fetch(getSubscriptionUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Get Subscription] Resposta do PagBank para ${subscription_id}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao consultar assinatura [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao consultar assinatura ${subscription_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 6. Sucesso!
    return NextResponse.json({
      message: `Detalhes da assinatura ${subscription_id} recuperados com sucesso!`,
      subscriptionDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao consultar assinatura PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao consultar assinatura.', details: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (assinaturas) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Verificar se o usuário tem permissão para alterar esta assinatura

    // 3. Obter subscription_id dos parâmetros da rota
    const { subscription_id } = params;
    if (!subscription_id) {
      return NextResponse.json({ error: 'O ID da assinatura é obrigatório para alteração.' }, { status: 400 });
    }

    // 4. Obter dados de atualização do corpo da requisição
    const updateData = await request.json();
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado fornecido para atualização da assinatura.' }, { status: 400 });
    }

    // 5. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 6. Montar o corpo da requisição para a API do PagBank
    // A API permite enviar apenas os campos que precisam ser alterados.
    const requestBodyPagBank = {};
    if (updateData.pro_rata !== undefined) requestBodyPagBank.pro_rata = updateData.pro_rata;
    if (updateData.best_invoice_date) requestBodyPagBank.best_invoice_date = updateData.best_invoice_date; // Objeto
    if (updateData.next_invoice_at) requestBodyPagBank.next_invoice_at = updateData.next_invoice_at; // Data YYYY-MM-DD
    if (updateData.amount) requestBodyPagBank.amount = updateData.amount; // Objeto { value, currency }
    if (updateData.plan && updateData.plan.id) requestBodyPagBank.plan = { id: updateData.plan.id }; // Objeto { id }
    if (updateData.coupon) requestBodyPagBank.coupon = updateData.coupon; // Objeto
    // Adicionar outros campos permitidos pela API de PUT /subscriptions/{id} se necessário

    // 7. Montar a URL e fazer a requisição
    const updateSubscriptionUrl = `${PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL}/${subscription_id}`;
    console.log(`[PagBank Update Subscription] Atualizando assinatura ID: ${subscription_id}. URL: ${updateSubscriptionUrl}`);
    console.log(`[PagBank Update Subscription] Enviando corpo:`, JSON.stringify(requestBodyPagBank, null, 2));

    const pagBankResponse = await fetch(updateSubscriptionUrl, {
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
    console.log(`[PagBank Update Subscription] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao atualizar assinatura [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao atualizar assinatura ${subscription_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 8. Sucesso!
    // TODO: Atualizar os dados da assinatura no seu banco de dados (Supabase) se necessário.

    return NextResponse.json({
      message: `Assinatura ${subscription_id} atualizada com sucesso!`,
      subscriptionDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao atualizar assinatura PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao atualizar assinatura.', details: error.message }, { status: 500 });
  }
}