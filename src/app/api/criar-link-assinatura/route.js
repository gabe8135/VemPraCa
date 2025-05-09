// src/app/api/criar-link-assinatura/route.js
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago'; // <<< Importar Preference
// import { createServerClient } from '@supabase/ssr'; // Não usaremos mais createServerClient aqui
import { createClient } from '@supabase/supabase-js'; // Usaremos o cliente padrão
import { cookies } from 'next/headers'; // Apenas para referência, não usado para auth

export async function POST(request) {
  console.log("API /api/criar-link-assinatura chamada");
  const startTime = Date.now(); // Para medir tempo

  // const cookieStore = cookies(); // Não precisamos mais ler cookies para auth
  let user = null; // Variável para guardar dados do usuário autenticado
  let userError = null;

  // --- Autenticação via Token no Header ---
  try {
    console.log("Tentando ler token JWT do cabeçalho Authorization...");
    const authHeader = request.headers.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.split('Bearer ')[1];
        console.log("Token JWT encontrado no header.");

        // Inicializa cliente Supabase padrão (sem SSR helpers)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            // Não precisa de config de auth especial aqui para getUser(jwt)
        );

        console.log("Validando token JWT com supabase.auth.getUser(jwt)...");
        // Valida o token e obtém o usuário DIRETAMENTE, sem usar cookies
        const { data: userData, error: getUserError } = await supabase.auth.getUser(jwt);
        user = userData?.user;
        userError = getUserError;
        console.log(`Resultado getUser(jwt): User=${!!user}, Error=${userError ? JSON.stringify(userError) : 'null'}`);
    } else {
        console.warn("Cabeçalho Authorization Bearer não encontrado ou inválido.");
        userError = new Error("Authorization header missing or invalid."); // Define um erro
    }
  } catch (authError) {
      console.error("Erro durante a tentativa de autenticação via header:", authError);
      userError = authError;
  }
  // --- Fim da Autenticação via Token no Header ---


  console.log(`Resultado final da autenticação: User=${!!user}, Error=${userError ? JSON.stringify(userError) : 'null'}`);

  // Verifica se o usuário foi autenticado com sucesso
  if (userError || !user) {
    console.warn(`Falha na autenticação. User: ${!!user}, Error: ${userError ? userError.message : 'Usuário nulo ou não encontrado'}`);
    // Retorna erro JSON
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
  }
  console.log(`Usuário ${user.email} autenticado com sucesso.`);

  // 2. Carrega credenciais e IDs dos planos
  console.log("Carregando variáveis de ambiente MP...");
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const planIdMonthly = process.env.MERCADO_PAGO_PLAN_ID_MONTHLY;
  const planIdYearly = process.env.MERCADO_PAGO_PLAN_ID_YEARLY;

  // --- Preços dos Planos (para o array 'items') ---
  // É importante que estes valores correspondam aos definidos nos planos do MP
  const monthlyPrice = 59.90;
  const yearlyPrice = 699.90;
  // -------------------------------------------------


  if (!accessToken || !planIdMonthly || !planIdYearly) {
    console.error("CRÍTICO: Credenciais ou IDs de plano MP não definidos nas variáveis de ambiente.");
    // Retorna erro JSON
    return NextResponse.json({ error: 'Configuração interna do servidor incompleta (MP Vars).' }, { status: 500 });
  }
  console.log("Variáveis MP carregadas.");

  try {
    // 3. Processa o corpo da requisição
    console.log("Processando corpo da requisição...");
    const body = await request.json();
    const { negocioId, planType } = body;
    console.log("Corpo recebido:", body);

    if (!negocioId || !planType) {
      console.warn("Requisição inválida: negocioId e planType são obrigatórios.");
      // Retorna erro JSON
      return NextResponse.json({ error: 'ID do negócio e tipo de plano são obrigatórios.' }, { status: 400 });
    }

    // 4. Seleciona o ID e Preço do plano
    let planIdToUse;
    let planPrice;
    let planTitle;
    if (planType === 'monthly') {
      planIdToUse = planIdMonthly;
      planPrice = monthlyPrice;
      planTitle = 'Assinatura Plano Mensal';
    } else if (planType === 'yearly') {
      planIdToUse = planIdYearly;
      planPrice = yearlyPrice;
      planTitle = 'Assinatura Plano Anual';
    } else {
      console.warn(`Tipo de plano inválido recebido: ${planType}`);
       // Retorna erro JSON
      return NextResponse.json({ error: 'Tipo de plano inválido. Use "monthly" ou "yearly".' }, { status: 400 });
    }
    console.log(`Usando planId: ${planIdToUse} para tipo: ${planType} com preço: ${planPrice}`);

    // 5. Configura e chama a API do Mercado Pago para criar PREFERÊNCIA
    console.log("Configurando cliente Mercado Pago...");
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    const preference = new Preference(client); // <<< Usar Preference

    // Log para verificar a URL base (mantido para referência, mas não usado nas back_urls abaixo)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    console.log(`INFO: Valor de NEXT_PUBLIC_BASE_URL: ${baseUrl}`);
    // if (!baseUrl || !baseUrl.startsWith('http')) {
    //     console.error("ERRO: NEXT_PUBLIC_BASE_URL não está definida corretamente como uma URL válida no .env.local");
    //     throw new Error("Configuração de URL base inválida no servidor.");
    // }

    console.log(`Criando Preferência de Pagamento para o plano MP ID: ${planIdToUse}...`);

    // --- Monta o corpo da Preferência ---
    const preferenceData = {
      // <<< ADICIONAR ARRAY 'items' >>>
      items: [
        {
          id: planIdToUse, // Usa o ID do plano como ID do item
          title: planTitle, // Título descritivo
          quantity: 1,
          currency_id: 'BRL', // Moeda
          unit_price: planPrice, // Preço correspondente ao plano
        }
      ],
      payer: { // Pode pré-preencher se tiver o email
        email: user.email,
      },
      back_urls: { // URLs para onde o usuário volta
        // Usar placeholders públicos para evitar rejeição de localhost
        success: `https://www.google.com/search?q=pagamento-aprovado&ref=${negocioId}`, // Adiciona ref para debug
        failure: `https://www.google.com/search?q=pagamento-falhou&ref=${negocioId}`,
        pending: `https://www.google.com/search?q=pagamento-pendente&ref=${negocioId}`,
      },
      auto_return: 'approved', // Retorna automaticamente apenas em caso de sucesso
      external_reference: `negocio_${negocioId}`, // Referência para identificar no webhook
      preapproval_plan_id: planIdToUse, // <<< Associa a preferência ao plano de assinatura
      // notification_url: SUA_URL_WEBHOOK (Opcional, já configurado no painel)
    };

    const preferenceResult = await preference.create({ body: preferenceData });
    console.log("Preferência de Pagamento criada com sucesso.");

    // 6. Extrai a URL de checkout da PREFERÊNCIA
    const checkoutUrl = preferenceResult?.sandbox_init_point; // <<< Pega o link da PREFERÊNCIA
    console.log(`Valor de sandbox_init_point: ${checkoutUrl}`);

    if (!checkoutUrl) {
      console.error("Erro CRÍTICO: 'sandbox_init_point' não encontrado na resposta da API de Preferências do MP.", preferenceResult);
      throw new Error('Link de checkout (sandbox_init_point) não encontrado na resposta da preferência MP.');
    }

    console.log(`Link de checkout gerado: ${checkoutUrl}. Tempo total: ${Date.now() - startTime}ms`);

    // 7. Retorna a URL de checkout (SUCESSO)
    return NextResponse.json({ checkoutUrl: checkoutUrl }, { status: 200 });

  } catch (error) {
    console.error(`Erro GERAL no processamento do link (${Date.now() - startTime}ms):`, error);

    const errorMessage = error.message || 'Falha ao gerar link de pagamento.';
    // Tenta obter o status do erro, default 500
    let statusCode = error.statusCode || error.status || 500;
    // Garante que seja um número válido
    statusCode = typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600 ? statusCode : 500;

    console.log(`Retornando erro JSON para o frontend: Status ${statusCode}, Mensagem: ${errorMessage}`);
    // Retorna um erro JSON estruturado
    return NextResponse.json({ error: errorMessage, details: error.cause }, { status: statusCode });
  }
}
