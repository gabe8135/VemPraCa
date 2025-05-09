// create_mp_plan.js
import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env.local
dotenv.config({ path: '.env.local' });

const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

if (!accessToken || !accessToken.startsWith('TEST-')) {
  console.error('Erro: MERCADO_PAGO_ACCESS_TOKEN não encontrado ou não é um token de TESTE no arquivo .env.local.');
  process.exit(1);
}

const client = new MercadoPagoConfig({ accessToken: accessToken });
const planClient = new PreApprovalPlan(client);

// Define uma URL placeholder válida, já que localhost pode ser rejeitado na criação do plano.
// A URL real será definida no fluxo de checkout.
// const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const backUrl = 'https://www.google.com'; // Placeholder válido
console.log(`INFO: Usando back_url: ${backUrl}`); // Log para verificar a URL

// --- Dados do Plano Mensal (TESTE) ---
const monthlyPlanData = {
  reason: 'Plano Mensal VemPraCá (TESTE)', // Identificador claro
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months', // Cobrança mensal
    repetitions: null, // Cobrar indefinidamente até cancelar
    billing_day: 10, // Dia do mês para cobrar (ex: 10)
    billing_day_proportional: true,
    transaction_amount: 59.90, // Valor mensal (Ajustado conforme seu último script)
    currency_id: 'BRL', // Moeda (Real Brasileiro)
  },
  back_url: backUrl, // Usa a variável definida
  payment_methods_allowed: {
    payment_types: [{ id: 'credit_card' }], // Apenas cartão de crédito
    payment_methods: [], // Deixar vazio para aceitar todos os cartões
  },
  // status: 'active', // O plano já é criado como ativo por padrão
};

// --- Dados do Plano Anual (TESTE) ---
const yearlyPlanData = {
  reason: 'Plano Anual VemPraCá (TESTE)', // Identificador claro
  auto_recurring: {
    frequency: 12, // <<< CORREÇÃO: 12
    frequency_type: 'months', // <<< CORREÇÃO: 'months' para representar 12 meses (anual)
    repetitions: null, // Cobrar indefinidamente até cancelar
    // billing_day: 10, // <<< REMOVIDO para simplificar
    // billing_day_proportional: false, // <<< REMOVIDO para simplificar
    transaction_amount: 699.90, // Valor ANUAL (Ajustado conforme seu último script)
    currency_id: 'BRL',
  },
  back_url: backUrl, // Usa a variável definida
  payment_methods_allowed: {
    payment_types: [{ id: 'credit_card' }],
    payment_methods: [],
  },
};


// --- Função para criar os planos ---
async function createPlans() {
  console.log('Usando Access Token de TESTE:', accessToken.substring(0, 15) + '...'); // Mostra parte do token
  let monthlyPlanId = null;
  let yearlyPlanId = null;

  try {
    console.log('\nTentando criar Plano Mensal de TESTE...');
    const monthlyResult = await planClient.create({ body: monthlyPlanData });
    console.log('--- SUCESSO: Plano Mensal de TESTE criado! ---');
    console.log('ID do Plano Mensal (TESTE):', monthlyResult.id);
    console.log('Status:', monthlyResult.status);
    console.log('----------------------------------------------\n');
    monthlyPlanId = monthlyResult.id; // Guarda o ID se criou com sucesso
  } catch (error) {
      // Se der erro, pode ser que já exista. Tenta buscar pelo 'reason'.
      // Nota: A API de planos não tem um método de busca fácil por 'reason'.
      // Vamos apenas logar o erro e continuar para o plano anual.
      console.warn('\n--- AVISO ao criar Plano Mensal ---');
      console.warn('Status:', error.statusCode);
      console.warn('Mensagem:', error.message);
      if (error.cause) {
        console.warn('Causa:', JSON.stringify(error.cause, null, 2));
      }
      console.warn('Pode ser que o plano mensal já exista. Verifique o ID da execução anterior se necessário.');
      console.warn('ID da execução anterior (se criou): 2c938084966c84bc0196999371cc14d7'); // <<< ID ATUALIZADO
      monthlyPlanId = '2c938084966c84bc0196999371cc14d7'; // <<< Assume o ID anterior (ATUALIZADO)
      console.warn('------------------------------------\n');
  }

  try {
    console.log('Tentando criar Plano Anual de TESTE...');
    const yearlyResult = await planClient.create({ body: yearlyPlanData });
    console.log('--- SUCESSO: Plano Anual de TESTE criado! ---');
    console.log('ID do Plano Anual (TESTE):', yearlyResult.id);
    console.log('Status:', yearlyResult.status);
    console.log('--------------------------------------------\n');
    yearlyPlanId = yearlyResult.id; // Guarda o ID se criou com sucesso
  } catch (error) {
    console.error('\n--- ERRO AO CRIAR PLANO ANUAL ---');
    console.error('Status:', error.statusCode);
    console.error('Mensagem:', error.message);
    if (error.cause) {
      console.error('Causa:', JSON.stringify(error.cause, null, 2));
    }
    console.error('Verifique os dados do plano anual e tente novamente.');
    console.error('---------------------------------\n');
    // Não sai do script se o mensal foi criado, mas avisa sobre o anual
  }

  // Imprime os IDs obtidos (ou o ID anterior do mensal se a criação dele falhou)
  if (monthlyPlanId && yearlyPlanId) {
      console.log('*********************************************************************');
      console.log('ATENÇÃO: Copie os IDs abaixo e cole no seu arquivo .env.local:');
      console.log(`MERCADO_PAGO_PLAN_ID_MONTHLY=${monthlyPlanId}`);
      console.log(`MERCADO_PAGO_PLAN_ID_YEARLY=${yearlyPlanId}`);
      console.log('*********************************************************************\n');
  } else if (monthlyPlanId) {
      console.log('*********************************************************************');
      console.log('ATENÇÃO: Plano Anual FALHOU. Copie apenas o ID do Plano Mensal:');
      console.log(`MERCADO_PAGO_PLAN_ID_MONTHLY=${monthlyPlanId}`);
      console.log('Verifique o erro do Plano Anual acima.');
      console.log('*********************************************************************\n');
  } else {
      console.log('*********************************************************************');
      console.log('ERRO: Nenhum plano foi criado ou identificado com sucesso.');
      console.log('Verifique os erros acima.');
      console.log('*********************************************************************\n');
  }
}

// Executa a função
createPlans();
