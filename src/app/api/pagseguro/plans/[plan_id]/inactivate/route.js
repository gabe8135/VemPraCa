import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

// Variáveis de ambiente para o token da API de Assinaturas
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX;
const PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO = process.env.PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;
const SANDBOX_MODE = process.env.NEXT_PUBLIC_PAGSEGURO_SANDBOX_MODE === 'true';

const PAGSEGURO_PLANS_API_BASE_URL = SANDBOX_MODE
  ? 'https://sandbox.api.assinaturas.pagseguro.com/plans'
  : 'https://api.assinaturas.pagseguro.com/plans'; // Verifique a URL de produção correta para planos

const PAGSEGURO_AUTH_TOKEN = SANDBOX_MODE ? PAGSEGURO_SUBSCRIPTIONS_TOKEN_SANDBOX : PAGSEGURO_SUBSCRIPTIONS_TOKEN_PRODUCAO;

export async function PUT(request, { params }) {
  // O { params } virá do Next.js com os parâmetros da rota dinâmica
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
    // TODO: Adicionar verificação se o usuário é admin, se a inativação de planos for restrita

    // 3. Obter plan_id dos parâmetros da rota
    const { plan_id } = params; // Extrai 'plan_id' do objeto params

    if (!plan_id) {
      // Esta verificação é mais por segurança, o Next.js não chamaria esta rota sem plan_id
      return NextResponse.json({ error: 'O ID do plano é obrigatório para inativação.' }, { status: 400 });
    }

    // 4. Gerar chave de idempotência
    const idempotencyKey = uuidv4();

    // 5. Montar a URL para inativar o plano
    const inactivatePlanUrl = `${PAGSEGURO_PLANS_API_BASE_URL}/${plan_id}/inactivate`;

    console.log(`[PagBank Inactivate Plan] Inativando plano ID: ${plan_id} na URL: ${inactivatePlanUrl}`);

    // 6. Fazer a requisição para a API de Inativação de Planos do PagBank
    // Esta requisição PUT não envia corpo (body)
    const pagBankResponse = await fetch(inactivatePlanUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${PAGSEGURO_AUTH_TOKEN}`,
        'x-idempotency-key': idempotencyKey,
      },
    });

    const responseData = await pagBankResponse.json();
    console.log(`[PagBank Inactivate Plan] Resposta do PagBank para inativação do plano ${plan_id}:`, JSON.stringify(responseData, null, 2));

    if (!pagBankResponse.ok) {
      console.error(`Erro da API de Planos PagBank ao inativar plano [${pagBankResponse.status}]:`, responseData);
      return NextResponse.json({
        error: `Falha ao inativar plano ${plan_id} no PagBank.`,
        details: responseData.error_messages || responseData.message || responseData
      }, { status: pagBankResponse.status });
    }

    // 7. Sucesso! Retornar os dados do plano (geralmente a API retorna o plano atualizado)
    return NextResponse.json({
      message: `Plano ${plan_id} inativado com sucesso no PagBank!`,
      planDetailsPagBank: responseData, // A resposta da API de inativação geralmente é o objeto do plano atualizado
    });

  } catch (error) {
    console.error('Erro interno do servidor ao inativar plano PagBank:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao inativar plano.', details: error.message }, { status: 500 });
  }
}
