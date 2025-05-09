// d:\Documentos\programação\hotel-portal\src\app\api\assinaturas\criar\route.js
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request) {
  console.log("API /api/assinaturas/criar chamada"); // Log para eu saber que esta API foi chamada.

  const cookieStore = cookies();
  // Preciso verificar a autenticação do usuário aqui. É uma boa prática.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        cookies: {
            // Lembrete: usar async/await aqui para ser compatível com o Supabase SSR.
            get: async (name) => (await cookieStore.get(name))?.value,
            set: async (name, value, options) => {
                try { await cookieStore.set({ name, value, ...options }); } catch (error) { console.error("Erro set cookie:", error); }
            },
            remove: async (name, options) => {
                try { await cookieStore.set({ name, value: '', ...options }); } catch (error) { console.error("Erro remove cookie:", error); }
            },
        }
    }
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.warn("Usuário não autenticado tentando criar link.");
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  }

  // Pego as credenciais e IDs dos planos do Mercado Pago das minhas variáveis de ambiente.
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const planIdMonthly = process.env.MERCADO_PAGO_PLAN_ID_MONTHLY;
  const planIdYearly = process.env.MERCADO_PAGO_PLAN_ID_YEARLY;
  
  // É crucial validar se essas variáveis de ambiente estão definidas.
  if (!accessToken || !planIdMonthly || !planIdYearly) {
    console.error("CRÍTICO: Credenciais ou IDs de plano MP não definidos nas variáveis de ambiente.");
    return NextResponse.json({ error: 'Configuração interna do servidor incompleta.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { negocioId, planType } = body; // Espero receber 'negocioId' e 'planType' ('monthly' ou 'yearly') no corpo da requisição.

    // Valido se os dados obrigatórios vieram na requisição.
    if (!negocioId || !planType) {
      console.warn("Requisição inválida: negocioId e planType são obrigatórios.", body);
      return NextResponse.json({ error: 'ID do negócio e tipo de plano são obrigatórios.' }, { status: 400 });
    }

    // Defino qual ID de plano do MP usar com base no 'planType' que recebi.
    let planIdToUse;
    if (planType === 'monthly') {
      planIdToUse = planIdMonthly;
    } else if (planType === 'yearly') {
      planIdToUse = planIdYearly;
    } else {
      console.warn(`Tipo de plano inválido recebido: ${planType}`);
      return NextResponse.json({ error: 'Tipo de plano inválido. Use "monthly" ou "yearly".' }, { status: 400 });
    }

    console.log(`Gerando link para negocioId: ${negocioId}, planType: ${planType}, planId: ${planIdToUse}`);

    // Configuro meu cliente do Mercado Pago.
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    const planClient = new PreApprovalPlan(client);

    // Busco os detalhes do plano lá no MP para tentar pegar o link de checkout de teste (sandbox_init_point).
    // NOTA PARA MIM MESMO: A API de Planos talvez não seja a melhor forma para gerar links dinâmicos.
    // O ideal seria criar uma PREFERÊNCIA DE PAGAMENTO aqui, associando o plano e a external_reference.
    // Mas, por enquanto, vou tentar pegar direto do plano.
    const planDetails = await planClient.get({ id: planIdToUse });

    console.log("Detalhes do plano obtidos:", JSON.stringify(planDetails, null, 2));

    // O link de checkout para o ambiente de teste (sandbox) geralmente vem no campo 'sandbox_init_point'.
    const checkoutUrl = planDetails?.sandbox_init_point;

    if (!checkoutUrl) {
      console.error("Erro: 'sandbox_init_point' não encontrado na resposta do plano.", planDetails);
      // Se o 'sandbox_init_point' não veio, realmente preciso considerar usar a API de Preferências de Pagamento.
      // Por enquanto, vou retornar um erro.
      throw new Error('Não foi possível obter o link de checkout para este plano diretamente. Considere usar a API de Preferências.');
    }

    // LEMBRETE IMPORTANTE: A 'external_reference' (que eu uso para ligar ao 'negocioId')
    // deveria ser associada de forma mais robusta, idealmente na criação da assinatura (talvez via webhook)
    // ou ao criar uma Preferência de Pagamento. Adicionar como query param no 'init_point' pode não ser o ideal ou não funcionar.
    // const finalUrl = `${checkoutUrl}?external_reference=negocio_${negocioId}`;
    console.log(`Link de checkout gerado: ${checkoutUrl}`);
    
    // Envio a URL de checkout de volta para o frontend.
    return NextResponse.json({ checkoutUrl: checkoutUrl }, { status: 200 });

  } catch (error) {
    console.error("Erro ao gerar link de assinatura:", error);

    let errorMessage = 'Falha ao gerar link de pagamento.';
    let statusCode = 500;
    let errorDetails = null;

     // Tento extrair mais detalhes do erro, especialmente se vier da API do Mercado Pago.
    if (error.cause) {
        try {
            errorDetails = typeof error.cause === 'string' ? JSON.parse(error.cause) : error.cause;
            errorMessage = errorDetails?.message || error.message || errorMessage;
        } catch (e) {
            console.error("Erro ao parsear error.cause:", e);
          errorMessage = error.message || errorMessage;
        }
        statusCode = error.statusCode || errorDetails?.status || statusCode;
        console.error('Causa detalhada do erro MP:', JSON.stringify(errorDetails, null, 2));
    } else {
        errorMessage = error.message || errorMessage;
        statusCode = error.statusCode || error.status || statusCode;
        console.error('Erro MP (sem causa detalhada):', error);
    }

    // Garanto que o statusCode seja um número HTTP válido.
    statusCode = typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600 ? statusCode : 500;

    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: statusCode });
  }
}
