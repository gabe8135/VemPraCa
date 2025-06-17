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

export async function GET(request) {
  // 1. Validar token de autenticação da API de Assinaturas
  if (!PAGSEGURO_AUTH_TOKEN) {
    console.error('Erro Crítico: Token da API de Assinaturas PagSeguro não configurado.');
    return NextResponse.json({ error: 'Configuração de pagamento (assinaturas) indisponível.' }, { status: 500 });
  }

  try {
    // 2. Obter usuário logado (opcional, para filtrar assinaturas por usuário se necessário)
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    // Se não houver usuário, pode listar todas as assinaturas (se for um admin)
    // ou retornar erro se a listagem for restrita.

    // 3. Obter parâmetros de consulta da URL
    const { searchParams } = new URL(request.url);
    const reference_id = searchParams.get('reference_id');
    const status = searchParams.getAll('status'); // Pode ser um array de status
    const payment_method_type = searchParams.getAll('payment_method_type'); // Pode ser um array
    const created_at_start = searchParams.get('created_at_start');
    const created_at_end = searchParams.get('created_at_end');
    const q = searchParams.get('q'); // Para busca por nome, email ou ID da assinatura
    // Adicionar offset e limit para paginação se a API do PagBank suportar na listagem geral
    const offset = searchParams.get('offset');
    const limit = searchParams.get('limit');


    // 4. Montar a URL de listagem com os parâmetros
    const queryParameters = new URLSearchParams();
    if (reference_id) queryParameters.append('reference_id', reference_id);
    status.forEach(s => queryParameters.append('status', s));
    payment_method_type.forEach(pmt => queryParameters.append('payment_method_type', pmt));
    if (created_at_start) queryParameters.append('created_at_start', created_at_start);
    if (created_at_end) queryParameters.append('created_at_end', created_at_end);
    if (q) queryParameters.append('q', q);
    if (offset) queryParameters.append('offset', offset);
    if (limit) queryParameters.append('limit', limit);


    let listSubscriptionsUrl = PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL;
    if (queryParameters.toString()) {
      listSubscriptionsUrl = `${PAGSEGURO_SUBSCRIPTIONS_API_BASE_URL}?${queryParameters.toString()}`;
    }

    console.log(`[PagBank List Subscriptions] Listando assinaturas. URL: ${listSubscriptionsUrl}`);

    // 5. Fazer a requisição para a API do PagBank
    const pagBankResponse = await fetch(listSubscriptionsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank List Subscriptions] Resposta do PagBank:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API PagBank ao listar assinaturas [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: 'Falha ao listar assinaturas no PagBank.',
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 6. Sucesso!
    return NextResponse.json({
      message: 'Assinaturas listadas com sucesso!',
      subscriptions: responseData, // A API retorna um objeto com uma lista de assinaturas
    });

  } catch (error) {
    console.error('Erro interno do servidor ao listar assinaturas PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao listar assinaturas.', details: error.message }, { status: 500 });
  }
}
