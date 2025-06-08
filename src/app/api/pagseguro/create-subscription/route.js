import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid'; // Para gerar a chave de idempotência

// Novas variáveis de ambiente para o token da API de Assinaturas
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_SUBSCRIPTIONS_API_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/subscriptions'
  : 'https://api.assinaturas.pagseguro.com/subscriptions'; // Verifique a URL de produção correta

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function POST(request) {
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação da API de Assinaturas
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

    // 3. Obter dados da requisição do frontend
    const {
      planIdPagSeguro, // Ex: 'PLAN_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' (ID do plano no PagSeguro)
      negocioId,       // ID do seu negócio interno
      // Dados do cliente (se for criar novo no PagSeguro)
      customerName,    // Obrigatório se não fornecer customer.id
      customerEmail,   // Obrigatório se não fornecer customer.id (pode usar user.email)
      customerTaxId,   // CPF/CNPJ, Obrigatório se não fornecer customer.id
      customerPhones,  // Array de telefones [{ country: "55", area: "XX", number: "XXXXXXXXX" }]
      // customerAddress, // Objeto de endereço, se necessário
      // Dados do método de pagamento (cartão tokenizado)
      cardToken,       // O TOKE_UUID obtido no frontend (obrigatório)
      // cardHolderName, // Nome do titular do cartão (obrigatório) - Adicionado abaixo
      cardSecurityCode // CVV do cartão
      // trialEndDate, // Opcional: se você quiser tentar definir um fim para o trial via API
    } = await request.json();

    // 4. Validações básicas
    if (!planIdPagSeguro || !negocioId || !cardToken || !cardSecurityCode) {
      return NextResponse.json({ error: 'Dados para criação da assinatura incompletos.' }, { status: 400 });
    }
    if (!customerName || !customerEmail || !customerTaxId || !customerPhones || customerPhones.length === 0) {
        // Exigindo dados do cliente para criar/atualizar no PagSeguro
        return NextResponse.json({ error: 'Dados do cliente para assinatura incompletos.' }, { status: 400 });
    }


    // 5. Gerar referência interna para a assinatura e chave de idempotência
    const suaReferenciaAssinatura = `VEMPRACA_SUB_${negocioId}_${Date.now()}`;
    const idempotencyKey = uuidv4();

    // 6. Montar o corpo da requisição para a API de Assinaturas do PagBank
    const requestBody = {
      reference_id: suaReferenciaAssinatura,
      plan: {
        id: planIdPagSeguro,
      },
      // A documentação de "Criar Assinatura" especifica os campos obrigatórios para `customer`
      // se um `customer.id` não for fornecido.
      customer: {
        reference_id: `VMPC_CUST_${user.id}_${negocioId}`, // Sua referência para o cliente no PagSeguro
        name: customerName,
        email: customerEmail,
        tax_id: customerTaxId.replace(/\D/g, ''), // Apenas números
        phones: customerPhones.map(phone => ({
            country: phone.country || "55",
            area: phone.area,
            number: phone.number
        })),
        // address: customerAddress, // Se necessário
        // birth_date: "YYYY-MM-DD" // Se necessário, conforme documentação
      },
      payment_method: [
        {
          type: 'CREDIT_CARD',
          card: {
            token: cardToken, // TOKE_UUID do frontend
            // A documentação de "Criar Assinatura" diz:
            // "Caso o seu cliente selecione a opção de pagamento com cartão de crédito, no momento de criação da assinatura
            // você irá informar apenas o código de segurança (security_code) do cartão. Isso, porque o cartão foi previamente tokenizado."
            // Isso sugere que o security_code é enviado aqui.
            // O objeto `card` dentro de `customer.billing_info` é para quando se está criando o assinante
            // e fornecendo dados complementares do cartão.
            security_code: cardSecurityCode, // CVV
          },
        },
      ],
      // Para o teste de 30 dias:
      // Se a API do PagBank permitir configurar um trial na criação da assinatura,
      // ou definir a data da primeira cobrança (next_invoice_at), seria aqui.
      // Exemplo (hipotético, verificar documentação exata):
      // trial: {
      //   days: 30
      // },
      // ou
      // next_invoice_at: trialEndDate, // Se o frontend calcular e enviar
      // pro_rata: false, // Geralmente para trials
    };

    // 7. Salvar a tentativa de criação de assinatura no seu banco de dados (Supabase)
    // Tabela: `negocio_assinaturas` (ou similar)
    // Status inicial: 'PENDENTE_CRIACAO_GATEWAY'
    const { data: dbSub, error: dbInsertError } = await supabase
      .from('negocio_assinaturas') // Crie esta tabela
      .insert({
        usuario_id: user.id,
        negocio_id: negocioId,
        plano_id_pagseguro: planIdPagSeguro, // ID do plano no PagSeguro
        referencia_interna: suaReferenciaAssinatura,
        status_assinatura: 'PENDENTE_CRIACAO_GATEWAY',
        // trial_fim_em: trialEndDate, // Se você gerencia o trial
      })
      .select()
      .single();

    if (dbInsertError) {
      console.error('Erro ao salvar registro de assinatura pendente no Supabase:', dbInsertError);
      return NextResponse.json({ error: 'Falha ao registrar tentativa de assinatura. Tente novamente.' }, { status: 500 });
    }

    // 8. Fazer a requisição para a API de Assinaturas do PagBank
    console.log('[PagBank Create Subscription] Enviando para PagBank:', JSON.stringify(requestBody, null, 2));
    const pagBankResponse = await fetch(PAGSEGURO_SUBSCRIPTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Adicionado conforme o exemplo de fetch
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await pagBankResponse.json(); // API de Assinaturas geralmente responde JSON
    console.log('[PagBank Create Subscription] Resposta do PagBank:', JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Assinaturas PagBank [${pagBankResponse.status}]:`, responseData);
      // Atualizar status no seu DB para falha
      await supabase
        .from('negocio_assinaturas')
        .update({
          status_assinatura: 'FALHA_CRIACAO_GATEWAY',
          gateway_resposta_bruta: responseData,
        })
        .eq('id', dbSub.id);
      return NextResponse.json({
        error: 'Falha ao criar assinatura no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 9. Sucesso! Atualizar seu banco de dados com o ID da assinatura do PagBank e outros detalhes
    const pagBankSubscriptionId = responseData.id; // Ex: 'SUBS_ABBCAE87-...'
    const statusPagBank = responseData.status;
    const proximoCobranca = responseData.next_invoice_at;
    const dataExpiracaoAssinatura = responseData.exp_at;


    await supabase
      .from('negocio_assinaturas')
      .update({
        pagseguro_subscription_id: pagBankSubscriptionId,
        status_assinatura: statusPagBank, // Ou um status interno seu mapeado (ex: 'ATIVA')
        data_proxima_cobranca: proximoCobranca,
        data_expiracao_assinatura: dataExpiracaoAssinatura, // Se retornado
        status_pagamento_atual: 'AGUARDANDO_COBRANCA', // Ou similar
        gateway_resposta_bruta: responseData,
      })
      .eq('id', dbSub.id);

    // Lógica para o trial de 30 dias:
    // Se a assinatura foi criada com sucesso e o PagBank não gerencia o trial,
    // você define a data_fim_vigencia no seu sistema para user.created_at + 30 dias.
    // E o status do negócio como 'ATIVO_EM_TESTE'.
    // O webhook de `invoice.paid` do PagBank confirmará o primeiro pagamento real.

    return NextResponse.json({
      message: 'Assinatura iniciada com sucesso!',
      subscriptionIdPagBank: pagBankSubscriptionId,
      statusPagBank: statusPagBank,
      suaReferencia: suaReferenciaAssinatura,
      nextInvoiceAt: proximoCobranca,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao criar assinatura PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', details: error.message }, { status: 500 });
  }
}
