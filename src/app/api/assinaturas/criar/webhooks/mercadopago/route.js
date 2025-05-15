// src/app/api/assinaturas/criar/webhooks/mercadopago/route.js
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'; // Adicionado Payment para buscar detalhes se necessário
import { createClient } from '@supabase/supabase-js'; // Meu cliente Supabase padrão.

export async function POST(request) {
  console.log("--- [WEBHOOK MP] Endpoint /api/assinaturas/criar/webhooks/mercadopago ATINGIDO ---");
  const startTime = Date.now(); // Para eu poder medir o tempo de processamento deste webhook.
  let body;

try {
    console.log("[WEBHOOK MP] Tentando parsear o corpo da requisição...");
    body = await request.json();
    console.log("[WEBHOOK MP] Corpo do Webhook Recebido:", JSON.stringify(body, null, 2)); // Log detalhado do corpo

    // --- Minha inicialização do cliente Supabase Admin aqui dentro do handler ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log(`[WEBHOOK MP] Supabase URL lida do env: ${supabaseUrl ? 'OK' : 'NÃO ENCONTRADA'}`);
    console.log(`[WEBHOOK MP] Supabase Service Key lida do env: ${supabaseServiceKey ? 'OK (existente)' : 'NÃO ENCONTRADA'}`);
    let supabaseAdmin;

    if (supabaseUrl && supabaseServiceKey) {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        console.log("[WEBHOOK MP] Cliente Supabase Admin INICIALIZADO com sucesso.");
    } else {
        if (!supabaseUrl) console.error("[WEBHOOK MP] ERRO CRÍTICO: NEXT_PUBLIC_SUPABASE_URL NÃO ENCONTRADA NO AMBIENTE DO WEBHOOK!");
        if (!supabaseServiceKey) console.error("[WEBHOOK MP] ERRO CRÍTICO: SUPABASE_SERVICE_ROLE_KEY NÃO ENCONTRADA NO AMBIENTE DO WEBHOOK!");
        return NextResponse.json({ error: 'Configuração interna do servidor (Supabase) incompleta.' }, { status: 500 });
    }
    // --- Fim da inicialização do Supabase Admin ---

    const topic = body?.topic;
    const resourceIdFromTopic = body?.resource;
    const legacyType = body?.type;
    const legacyAction = body?.action;
    const legacyDataId = body?.data?.id;

    const effectiveNotificationType = topic || legacyType;
    const effectiveResourceId = resourceIdFromTopic || legacyDataId;

    console.log(`[WEBHOOK MP] Detalhes do Payload Bruto - Topic: ${topic}, Resource: ${resourceIdFromTopic}, LegacyType: ${legacyType}, LegacyAction: ${legacyAction}, LegacyDataId: ${legacyDataId}`);
    console.log(`[WEBHOOK MP] Valores Efetivos Usados - Type: ${effectiveNotificationType}, ResourceID: ${effectiveResourceId}`);

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
        console.error("[WEBHOOK MP] ERRO CRÍTICO: MERCADO_PAGO_ACCESS_TOKEN NÃO ENCONTRADO NO AMBIENTE DO WEBHOOK!");
        return NextResponse.json({ error: 'Configuração interna do servidor (MP Token) incompleta.' }, { status: 500 });
    }
    const mpClient = new MercadoPagoConfig({ accessToken: accessToken });


    if (effectiveNotificationType === 'payment') {
        console.log(`[WEBHOOK MP] Notificação de Payment recebida: ID=${effectiveResourceId}, Action=${legacyAction || 'N/A'}.`);
        // Embora estejamos focados em 'preapproval', vamos buscar os detalhes do pagamento
        // para ver se ele contém o 'external_reference' e se o status é 'approved'.
        // Isso pode ser um fallback ou uma forma de obter o external_reference se o evento de preapproval demorar.
        try {
            const paymentClient = new Payment(mpClient);
            console.log(`[WEBHOOK MP] Buscando detalhes do Pagamento ID: ${effectiveResourceId} (originado de um evento 'payment')...`);
            const paymentDetails = await paymentClient.get({ id: effectiveResourceId });
            console.log("[WEBHOOK MP] Detalhes do Pagamento (evento 'payment'):", JSON.stringify(paymentDetails, null, 2));

            // Se este pagamento estiver aprovado e tiver uma external_reference,
            // poderíamos teoricamente ativar o negócio aqui, mas o ideal é esperar o evento de assinatura.
            // Por enquanto, apenas logamos e aguardamos o evento de assinatura.
            if (paymentDetails.status === 'approved' && paymentDetails.external_reference?.startsWith('negocio_')) {
                console.log(`[WEBHOOK MP] Pagamento ID ${effectiveResourceId} está 'approved' e tem external_reference. Aguardando evento de assinatura para ação final.`);
            }
        } catch (paymentError) {
            console.error(`[WEBHOOK MP] Erro ao buscar detalhes do pagamento ${effectiveResourceId} (originado de um evento 'payment'):`, paymentError);
        }
        return NextResponse.json({ received: true, message: "Notificação de pagamento recebida e logada, aguardando evento de assinatura." }, { status: 200 });
    }

    // Tópicos relevantes para o status da assinatura
    const subscriptionTopics = ['preapproval', 'subscription_preapproval', 'subscription_authorized_payment'];

    if (subscriptionTopics.includes(effectiveNotificationType)) {
        console.log(`[WEBHOOK MP] Notificação de Assinatura (${effectiveNotificationType}) recebida: ID=${effectiveResourceId}, Action=${legacyAction || 'N/A'}`);

        if (!effectiveResourceId) {
            console.warn("[WEBHOOK MP] Webhook de Assinatura sem ID de recurso.");
            return NextResponse.json({ received: true, message: "ID do recurso não encontrado na notificação de assinatura." }, { status: 200 });
        }

        console.log("[WEBHOOK MP] Access Token MP carregado (para assinatura).");
        const preapprovalClient = new PreApproval(mpClient);
        
        console.log(`[WEBHOOK MP] Buscando detalhes da Assinatura (PreApproval) ID: ${effectiveResourceId}...`);
        const subscriptionDetails = await preapprovalClient.get({ id: effectiveResourceId });
        console.log("[WEBHOOK MP] Detalhes da assinatura MP:", JSON.stringify(subscriptionDetails, null, 2));

        const preapprovalIdFromDetails = subscriptionDetails?.id;
        const statusFromDetails = subscriptionDetails?.status;
        const externalReferenceFromDetails = subscriptionDetails?.external_reference;

        if (!preapprovalIdFromDetails || !statusFromDetails || !externalReferenceFromDetails || !externalReferenceFromDetails.startsWith('negocio_')) {
            console.warn("[WEBHOOK MP] Dados insuficientes ou inválidos nos detalhes da assinatura MP para atualizar Supabase.", { 
                id: preapprovalIdFromDetails, status: statusFromDetails, external_reference: externalReferenceFromDetails 
            });
            return NextResponse.json({ received: true, message: "Dados insuficientes ou inválidos da API MP para assinatura." }, { status: 200 });
        }

        const negocioId = externalReferenceFromDetails.split('negocio_')[1];
        if (!negocioId) {
            console.warn("[WEBHOOK MP] Não foi possível extrair negocioId da external_reference:", externalReferenceFromDetails);
            return NextResponse.json({ received: true, message: "NegocioId não extraído da external_reference." }, { status: 200 });
        }

        console.log(`[WEBHOOK MP] Atualizando Supabase para negocioId: ${negocioId}, PreApproval ID (do detalhe): ${preapprovalIdFromDetails}, Status: ${statusFromDetails}`);

        let updateData = {
            preapproval_id: preapprovalIdFromDetails,
            status_assinatura: statusFromDetails,
        };

        if (statusFromDetails === 'authorized') {
            updateData.ativo = true;
            updateData.data_ativacao = new Date().toISOString();
            console.log(`[WEBHOOK MP] Status 'authorized'. Definindo ativo = true.`);
        } else if (statusFromDetails === 'cancelled' || statusFromDetails === 'paused') {
             updateData.ativo = false;
             updateData.data_desativacao = new Date().toISOString();
            console.log(`[WEBHOOK MP] Status '${statusFromDetails}'. Definindo ativo = false.`);
        }
        // Adicionar outros status se necessário, ex: 'pending_cancel', 'suspended'

        const { error: updateError } = await supabaseAdmin
            .from('negocios')
            .update(updateData)
            .eq('id', negocioId);
        console.log("[WEBHOOK MP] Query de update para Supabase executada.");

        if (updateError) {
            console.error(`[WEBHOOK MP] Erro ao atualizar Supabase para negocio ${negocioId} (PreApproval ID: ${preapprovalIdFromDetails}):`, updateError);
            return NextResponse.json({ received: true, error: "Falha ao atualizar DB" }, { status: 200 });
        }

        console.log(`[WEBHOOK MP] Supabase atualizado com sucesso para negocio ${negocioId}. Tempo: ${Date.now() - startTime}ms`);
        return NextResponse.json({ received: true, message: "Webhook de assinatura processado." }, { status: 200 });

    } else {
        console.log(`[WEBHOOK MP] Tipo de notificação não tratado: ${effectiveNotificationType}. Payload: ${JSON.stringify(body, null, 2)}. Tempo: ${Date.now() - startTime}ms`);
        return NextResponse.json({ received: true, message: "Tipo de notificação não compreendido." }, { status: 200 });
    }

} catch (error) {
    console.error(`[WEBHOOK MP] Erro GERAL ao processar Webhook Mercado Pago. Tempo: ${Date.now() - startTime}ms`, error);
    if (error.message) console.error("[WEBHOOK MP] Error Message:", error.message);
    if (error.stack) console.error("[WEBHOOK MP] Error Stack:", error.stack);
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 500 });
}
}
