import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Variáveis de ambiente para o token da API de Assinaturas
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_CUSTOMERS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/customers'
  : 'https://api.assinaturas.pagseguro.com/customers'; // Verifique a URL de produção correta

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function PUT(request, { params }) {
  // O { params } virá do Next.js com os parâmetros da rota dinâmica
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (billing_info) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (e verificar se é admin ou se o customer_id pertence ao usuário)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Adicionar verificação se o usuário é admin ou se o customer_id está associado ao user.id

    // 3. Obter customer_id dos parâmetros da rota
    const { customer_id } = params; // Extrai 'customer_id' do objeto params

    if (!customer_id) {
      // Esta verificação é mais por segurança
      return NextResponse.json({ error: 'O ID do assinante é obrigatório para atualizar os dados de pagamento.' }, { status: 400 });
    }

    // 4. Obter os novos dados de pagamento do corpo da requisição
    // A documentação indica "RAW_BODY array of objects"
    // Vamos assumir que o frontend enviará um array contendo um objeto de cartão.
    const newBillingInfoArray = await request.json();

    if (!Array.isArray(newBillingInfoArray) || newBillingInfoArray.length === 0) {
      return NextResponse.json({ error: 'Dados de pagamento (billing_info) inválidos ou não fornecidos. Deve ser um array.' }, { status: 400 });
    }

    // Validação básica do primeiro item do array (assumindo um cartão)
    const cardInfo = newBillingInfoArray[0];
    if (!cardInfo || cardInfo.type !== 'CREDIT_CARD' || !cardInfo.card || !cardInfo.card.encrypted_data) {
        return NextResponse.json({ error: 'Formato inválido para os dados do cartão de crédito. Verifique type e encrypted_data.' }, { status: 400 });
    }

    // 5. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 6. Montar a URL para atualizar os dados de pagamento
    const updateBillingInfoUrl = `${PAGSEGURO_CUSTOMERS_API_BASE_URL}/${customer_id}/billing_info`;

    console.log(`[PagBank Update BillingInfo] Atualizando dados de pagamento para o assinante ID: ${customer_id} na URL: ${updateBillingInfoUrl}`);
    console.log(`[PagBank Update BillingInfo] Enviando corpo:`, JSON.stringify(newBillingInfoArray, null, 2));


    // 7. Fazer a requisição para a API do PagBank
    const pagBankResponse = await fetch(updateBillingInfoUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(newBillingInfoArray), // Envia o array diretamente
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Update BillingInfo] Resposta do PagBank para ${customer_id}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao atualizar billing_info [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao atualizar dados de pagamento para o assinante ${customer_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 8. Sucesso!
    return NextResponse.json({
      message: `Dados de pagamento do assinante ${customer_id} atualizados com sucesso no PagBank!`,
      billingInfoDetailsPagBank: responseData, // A API geralmente retorna o billing_info atualizado
    });

  } catch (error) {
    console.error('Erro interno do servidor ao atualizar dados de pagamento do assinante PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao atualizar dados de pagamento.', details: error.message }, { status: 500 });
  }
}
