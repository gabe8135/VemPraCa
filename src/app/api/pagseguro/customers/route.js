import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Variáveis de ambiente para o token da API de Assinaturas
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_CUSTOMERS_API_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/customers'
  : 'https://api.assinaturas.pagseguro.com/customers'; // Verifique a URL de produção correta

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function POST(request) {
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (clientes) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (opcional, dependendo da sua lógica de quem pode criar clientes)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      // Poderia permitir a criação de clientes mesmo sem usuário logado,
      // se o contexto permitir (ex: um admin criando clientes).
      // Por agora, vamos exigir autenticação.
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // 3. Obter dados da requisição do frontend para criar o assinante
    const {
      reference_id, // Opcional, seu identificador interno para o cliente
      name,           // Obrigatório
      email,          // Obrigatório
      tax_id,         // Obrigatório (CPF/CNPJ)
      phones,         // Obrigatório (array de objetos phone)
      birth_date,     // Opcional
      address,        // Obrigatório (objeto address)
      // billing_info é um array de objetos, vamos esperar um único objeto de cartão por enquanto
      billing_info_card, // Objeto contendo { encrypted_data: "..." }
    } = await request.json();

    // 4. Validações básicas dos dados do assinante
    if (!name || !email || !tax_id || !phones || phones.length === 0 || !address) {
      return NextResponse.json({ error: 'Dados obrigatórios para criação do assinante incompletos.' }, { status: 400 });
    }
    // Validação do billing_info_card se fornecido
    if (billing_info_card && !billing_info_card.encrypted_data) {
        return NextResponse.json({ error: 'Dados do cartão em billing_info_card incompletos (encrypted_data é obrigatório).' }, { status: 400 });
    }


    // 5. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 6. Montar o corpo da requisição para a API de Clientes do PagBank
    const requestBody = {
      reference_id: reference_id || `VMPC_CUST_${user.id}_${Date.now()}`, // Ou uma referência mais estável se o cliente já existe no seu sistema
      name,
      email,
      tax_id: tax_id.replace(/\D/g, ''), // Apenas números
      phones: phones.map(phone => ({
        country: phone.country || "55",
        area: phone.area,
        number: phone.number,
        type: phone.type || "MOBILE" // Ex: MOBILE, HOME, WORK - verificar documentação para tipos válidos
      })),
      address: {
        street: address.street,
        number: address.number,
        complement: address.complement,
        district: address.district,
        city: address.city,
        state: address.state, // Sigla do estado, ex: SP
        country: address.country || "BRA", // Padrão Brasil
        postal_code: address.postal_code.replace(/\D/g, ''), // Apenas números
      }
    };

    if (birth_date) {
      requestBody.birth_date = birth_date; // Formato AAAA-MM-DD
    }

    if (billing_info_card && billing_info_card.encrypted_data) {
      requestBody.billing_info = [ // billing_info é um array
        {
          type: 'CREDIT_CARD', // Assumindo cartão de crédito
          card: {
            encrypted_data: billing_info_card.encrypted_data,
            // O CVV já está no encrypted_data.
            // Se a API exigisse holder_name aqui, seria adicionado.
          }
        }
      ];
    }

    // 7. Fazer a requisição para a API de Clientes do PagBank
    console.log('[PagBank Create Customer] Enviando para PagBank:', JSON.stringify(requestBody, null, 2));

    const pagBankResponse = await fetch(PAGSEGURO_CUSTOMERS_API_URL, {
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
    console.log('[PagBank Create Customer] Resposta do PagBank:', JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Clientes PagBank [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: 'Falha ao criar assinante no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 8. Sucesso! Retornar os dados do assinante criado
    // O ID do assinante estará em responseData.id (ex: CUST_XXXXXXXX-...)
    // Você pode querer salvar/atualizar os detalhes do cliente no seu banco de dados aqui.
    // Ex: await supabase.from('profiles').update({ pagbank_customer_id: responseData.id }).eq('id', user.id);

    return NextResponse.json({
      message: 'Assinante criado com sucesso no PagBank!',
      customerDetailsPagBank: responseData,
    });

  } catch (error) {
    console.error('Erro interno do servidor ao criar assinante PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  // 1. Validar token de autenticação da API de Assinaturas
  // (Já definido no escopo do módulo)
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (clientes) indisponível.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const customerIdFromQuery = searchParams.get('id'); // Para consulta por ID específico

    let targetUrl = PAGSEGURO_CUSTOMERS_API_URL;
    let logMessageAction = '[PagBank List Customers] Listando assinantes.';

    if (customerIdFromQuery) {
      // Consulta por ID específico
      targetUrl = `${PAGSEGURO_CUSTOMERS_API_URL}/${customerIdFromQuery}`;
      logMessageAction = `[PagBank Get Customer] Consultando assinante ID: ${customerIdFromQuery}.`;
    } else {
      // Listagem com possíveis filtros e paginação
      const offset = searchParams.get('offset');
      const limit = searchParams.get('limit');
      const reference_id_filter = searchParams.get('reference_id');
      const q_filter = searchParams.get('q');

      const queryParameters = new URLSearchParams();
      if (offset) queryParameters.append('offset', offset);
      if (limit) queryParameters.append('limit', limit);
      if (reference_id_filter) queryParameters.append('reference_id', reference_id_filter);
      if (q_filter) queryParameters.append('q', q_filter);

      if (queryParameters.toString()) {
        targetUrl = `${PAGSEGURO_CUSTOMERS_API_URL}?${queryParameters.toString()}`;
      }
    }

    console.log(`${logMessageAction} URL: ${targetUrl}`);

    const pagBankResponse = await fetch(customerSpecificUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        // O header 'q' é para a API do PagBank, não para o fetch diretamente,
        // ele é passado como query param se for o caso de listagem.
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Customers GET] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      const actionDescription = customerIdFromQuery ? `consultar assinante ${customerIdFromQuery}` : 'listar assinantes';
      console.error(`Erro da API de Clientes PagBank ao ${actionDescription} [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao ${actionDescription} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // Sucesso! Retornar os dados do assinante consultado.
    const successMessage = customerIdFromQuery
      ? `Detalhes do assinante ${customerIdFromQuery} recuperados com sucesso!`
      : 'Assinantes listados com sucesso!';

    return NextResponse.json({
      message: successMessage,
      data: responseData, // A resposta pode ser um objeto (consulta por ID) ou um array (listagem)
    });

  } catch (error) {
    console.error('Erro interno do servidor ao consultar assinante PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao consultar assinante.', details: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const supabase = createServerActionClient({ cookies });

  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (clientes) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (e verificar se é admin, se necessário)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }
    // TODO: Adicionar verificação se o usuário é admin ou se o customer_id pertence ao usuário logado.

    // 3. Obter customer_id dos parâmetros da URL
    const { searchParams } = new URL(request.url);
    const customer_id_to_update = searchParams.get('id');

    if (!customer_id_to_update) {
      return NextResponse.json({ error: 'O parâmetro "id" do assinante é obrigatório para atualização.' }, { status: 400 });
    }

    // 4. Obter dados da requisição do frontend para atualizar o assinante
    // A API permite enviar apenas os campos que precisam ser atualizados.
    const updateData = await request.json();

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    // 5. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 6. Montar o corpo da requisição para a API de Clientes do PagBank
    // Inclui apenas os campos fornecidos em updateData.
    const requestBodyPagBank = {};

    if (updateData.reference_id) requestBodyPagBank.reference_id = updateData.reference_id;
    if (updateData.name) requestBodyPagBank.name = updateData.name;
    if (updateData.email) requestBodyPagBank.email = updateData.email;
    // tax_id geralmente não é alterável após a criação, mas se a API permitir:
    // if (updateData.tax_id) requestBodyPagBank.tax_id = updateData.tax_id.replace(/\D/g, '');
    if (updateData.phones) {
        requestBodyPagBank.phones = updateData.phones.map(phone => ({
            country: phone.country || "55",
            area: phone.area,
            number: phone.number,
            type: phone.type || "MOBILE"
        }));
    }
    if (updateData.birth_date) requestBodyPagBank.birth_date = updateData.birth_date;
    if (updateData.address) {
        requestBodyPagBank.address = {
            street: updateData.address.street,
            number: updateData.address.number,
            complement: updateData.address.complement,
            district: updateData.address.district,
            city: updateData.address.city,
            state: updateData.address.state,
            country: updateData.address.country || "BRA",
            postal_code: updateData.address.postal_code?.replace(/\D/g, ''),
        };
    }
    // A API de PUT /customers/{customer_id} não parece aceitar billing_info para atualização de cartão.
    // A atualização de método de pagamento geralmente é feita por um endpoint específico de billing_info.

    // 7. Fazer a requisição para a API de Clientes do PagBank
    const customerUpdateUrl = `${PAGSEGURO_CUSTOMERS_API_URL}/${customer_id_to_update}`;
    console.log(`[PagBank Update Customer] Enviando para PagBank URL: ${customerUpdateUrl}`, JSON.stringify(requestBodyPagBank, null, 2));

    const pagBankResponse = await fetch(customerUpdateUrl, {
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
    console.log(`[PagBank Update Customer] Resposta do PagBank para o assinante ${customer_id_to_update}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Clientes PagBank ao atualizar assinante [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({ error: `Falha ao atualizar assinante ${customer_id_to_update} no PagBank.`, details: responseData.error_messages || responseData.message || responseData }, { status: pagBankResponse.status });
    }

    return NextResponse.json({ message: `Assinante ${customer_id_to_update} atualizado com sucesso no PagBank!`, customerDetailsPagBank: responseData });

  } catch (error) {
    console.error('Erro interno do servidor ao atualizar assinante PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao atualizar assinante.', details: error.message }, { status: 500 });
  }
}
