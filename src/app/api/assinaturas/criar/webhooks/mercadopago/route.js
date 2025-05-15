// src/app/api/assinaturas/criar/webhooks/mercadopago/route.js
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js'; // Meu cliente Supabase padrão.

export async function POST(request) {
  console.log("--- [WEBHOOK MP] Endpoint /api/assinaturas/criar/webhooks/mercadopago ATINGIDO ---");
  const startTime = Date.now(); // Para eu poder medir o tempo de processamento deste webhook.
  let body;

try {
    console.log("[WEBHOOK MP] Tentando parsear o corpo da requisição...");
    body = await request.json();
    console.log("Corpo do Webhook:", JSON.stringify(body, null, 2));

    // --- Minha inicialização do cliente Supabase Admin aqui dentro do handler ---
    // Preciso fazer isso aqui porque as variáveis de ambiente podem não estar disponíveis no escopo global em serverless functions.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log(`[WEBHOOK MP] Supabase URL lida do env: ${supabaseUrl ? 'OK' : 'NÃO ENCONTRADA'}`);
    console.log(`[WEBHOOK MP] Supabase Service Key lida do env: ${supabaseServiceKey ? 'OK (existente)' : 'NÃO ENCONTRADA'}`); // Não logar a chave inteira
    let supabaseAdmin;

    if (supabaseUrl && supabaseServiceKey) {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey); // Esta linha pode falhar se as vars estiverem erradas
        console.log("[WEBHOOK MP] Cliente Supabase Admin INICIALIZADO com sucesso.");
    } else {
        // Log para me ajudar a debugar se alguma variável de ambiente do Supabase estiver faltando.
        if (!supabaseUrl) console.error("[WEBHOOK MP] ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_URL NÃO ENCONTRADA NO AMBIENTE DO WEBHOOK!");
        if (!supabaseServiceKey) console.error("[WEBHOOK MP] ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY NÃO ENCONTRADA NO AMBIENTE DO WEBHOOK!");
    }

    // Validação se o cliente Supabase foi criado com sucesso
    if (!supabaseAdmin) {
        console.error("[WEBHOOK MP] Falha ao inicializar Cliente Supabase Admin. Verifique as variáveis de ambiente no servidor.");
        // Retorna 500 pois é um erro de configuração/ambiente
        return NextResponse.json({ error: 'Configuração interna do servidor (Supabase) incompleta.' }, { status: 500 });
    }
    // --- Fim da inicialização do Supabase Admin ---

    // Tipos comuns de notificação para assinaturas
    const notificationType = body?.type;
    const notificationAction = body?.action;
    const dataId = body?.data?.id; // Este é o ID da entidade (pagamento, assinatura, etc.) que o MP envia.

    // --- Lógica para tratar notificação do tipo 'payment' ---
    // O Mercado Pago envia 'payment' primeiro, depois 'preapproval'.
    // Posso ignorar 'payment' ou, no futuro, usá-lo para buscar o preapproval_id se a notificação 'preapproval' falhar.
    if (notificationType === 'payment') {
        console.log(`[WEBHOOK MP] Notificação de Payment recebida: ID=${dataId}, Action=${notificationAction}. Ignorando por enquanto, esperando 'preapproval'.`);
        // Por agora, vou focar apenas na notificação 'preapproval'.
        return NextResponse.json({ received: true, message: "Notificação de pagamento recebida, aguardando preapproval." }, { status: 200 });
    }

    if (notificationType === 'preapproval') {
        console.log(`[WEBHOOK MP] Notificação de PreApproval recebida: ID=${dataId}, Action=${notificationAction}`);

        if (!dataId) {
            console.warn("[WEBHOOK MP] Webhook PreApproval sem data.id");
            return NextResponse.json({ received: true, message: "ID não encontrado na notificação de preapproval" }, { status: 200 });
        }

        // Preciso buscar os detalhes da assinatura lá no Mercado Pago para pegar o status e a external_reference.
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) {
            console.error("[WEBHOOK MP] ERRO CRÍTICO: MERCADO_PAGO_ACCESS_TOKEN NÃO ENCONTRADO NO AMBIENTE DO WEBHOOK!");
            // Isso é um erro de configuração, então retorno 500.
            return NextResponse.json({ error: 'Configuração interna do servidor (MP Token) incompleta.' }, { status: 500 });
        }
        console.log("[WEBHOOK MP] Access Token MP carregado.");

        const client = new MercadoPagoConfig({ accessToken: accessToken });
        const preapproval = new PreApproval(client);
        console.log(`[WEBHOOK MP] Buscando detalhes da PreApproval ID: ${dataId}...`);
        const subscriptionDetails = await preapproval.get({ id: dataId });
        console.log("[WEBHOOK MP] Detalhes da assinatura MP:", JSON.stringify(subscriptionDetails, null, 2));

        const preapprovalId = subscriptionDetails?.id;
        const status = subscriptionDetails?.status;
        const externalReference = subscriptionDetails?.external_reference; // Minha referência externa, tipo "negocio_ID_DO_MEU_NEGOCIO".

        // Validação importante dos dados que vieram da API do MP.
        if (!preapprovalId || !status || !externalReference || !externalReference.startsWith('negocio_')) {
            console.warn("[WEBHOOK MP] Dados insuficientes ou inválidos nos detalhes da assinatura MP para atualizar Supabase.", { preapprovalId, status, externalReference });
            // Respondo 200 OK para o MP não ficar tentando de novo, mas registro o aviso. Não dá pra atualizar o banco assim.
            return NextResponse.json({ received: true, message: "Dados insuficientes ou inválidos da API MP." }, { status: 200 });
        }

        const negocioId = externalReference.split('negocio_')[1];
        if (!negocioId) {
            console.warn("[WEBHOOK MP] Não foi possível extrair negocioId da external_reference:", externalReference);
             // Mesma coisa: 200 OK para o MP, mas aviso que não consegui extrair o ID do negócio.
            return NextResponse.json({ received: true, message: "NegocioId não extraído da external_reference." }, { status: 200 });
        }

        console.log(`[WEBHOOK MP] Atualizando Supabase para negocioId: ${negocioId}, PreApproval ID: ${preapprovalId}, Status: ${status}`);

        // Agora sim, atualizo o negócio lá no Supabase.
        // Preciso definir o campo 'ativo' com base no status da assinatura.
        let updateData = {
            preapproval_id: preapprovalId,
            status_assinatura: status,
            // data_atualizacao: new Date().toISOString() // Poderia atualizar a data aqui também, se quisesse.
        };

        if (status === 'authorized') {
            updateData.ativo = true; // Ativa o negócio
            updateData.data_ativacao = new Date().toISOString(); // Registra data de ativação
            console.log(`[WEBHOOK MP] Status 'authorized'. Definindo ativo = true.`);
        } else if (status === 'cancelled' || status === 'paused') {
             updateData.ativo = false; // Desativa o negócio
             updateData.data_desativacao = new Date().toISOString(); // Registra data de desativação
            console.log(`[WEBHOOK MP] Status '${status}'. Definindo ativo = false.`);
        } // Você pode adicionar outros status se necessário (ex: 'pending', 'suspended')

        const { error: updateError } = await supabaseAdmin // Use supabaseAdmin para bypassar RLS se necessário
            .from('negocios')
            .update(updateData)
            .eq('id', negocioId); // Uso o ID do negócio que extraí da external_reference.
        console.log("[WEBHOOK MP] Query de update para Supabase executada.");
        if (updateError) {
            console.error(`[WEBHOOK MP] Erro ao atualizar Supabase para negocio ${negocioId} (PreApproval ID: ${preapprovalId}):`, updateError);
            // Respondo 200 para o MP não reenviar, mas registro o erro interno.
            return NextResponse.json({ received: true, error: "Falha ao atualizar DB" }, { status: 200 });
        }

        console.log(`[WEBHOOK MP] Supabase atualizado com sucesso para negocio ${negocioId}. Tempo: ${Date.now() - startTime}ms`);
        return NextResponse.json({ received: true }, { status: 200 });

    } else {
        console.log(`[WEBHOOK MP] Tipo de notificação não tratado: ${notificationType}. Tempo: ${Date.now() - startTime}ms`);
        return NextResponse.json({ received: true, message: "Tipo não tratado" }, { status: 200 });
    }

} catch (error) {
    // Log para qualquer erro geral que acontecer no processamento.
    console.error(`[WEBHOOK MP] Erro GERAL ao processar Webhook Mercado Pago. Tempo: ${Date.now() - startTime}ms`, error);
    // Log more details about the error if available
    if (error.message) console.error("[WEBHOOK MP] Error Message:", error.message);
    if (error.stack) console.error("[WEBHOOK MP] Error Stack:", error.stack);
    // Retorno 500 para indicar que algo deu errado do meu lado.
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 500 });
}
}
