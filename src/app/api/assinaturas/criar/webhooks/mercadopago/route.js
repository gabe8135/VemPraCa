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
        // Retorna 500 se as variáveis do Supabase não estiverem configuradas
        return NextResponse.json({ error: 'Configuração interna do servidor (Supabase) incompleta.' }, { status: 500 });
    }
    // --- Fim da inicialização do Supabase Admin ---

    // Extração dos campos relevantes de ambos os formatos de webhook
    const topic = body?.topic; // Formato novo: "payment", "preapproval", "subscription_preapproval"
    const resourceIdFromTopic = body?.resource; // Formato novo: ID do recurso

    const legacyType = body?.type; // Formato antigo/teste: "payment", "preapproval"
    const legacyAction = body?.action; // Formato antigo/teste
    const legacyDataId = body?.data?.id; // Formato antigo/teste

    // Determina o tipo de notificação e o ID do recurso a ser usado
    // Prioriza o formato com "topic" se presente, senão usa o formato com "type"
    const effectiveNotificationType = topic || legacyType;
    const effectiveResourceId = resourceIdFromTopic || legacyDataId;

    console.log(`[WEBHOOK MP] Detalhes do Payload Bruto - Topic: ${topic}, Resource: ${resourceIdFromTopic}, LegacyType: ${legacyType}, LegacyAction: ${legacyAction}, LegacyDataId: ${legacyDataId}`);
    console.log(`[WEBHOOK MP] Valores Efetivos Usados - Type: ${effectiveNotificationType}, ResourceID: ${effectiveResourceId}`);

    if (effectiveNotificationType === 'payment') {
        console.log(`[WEBHOOK MP] Notificação de Payment recebida: ID=${effectiveResourceId}, Action=${legacyAction || 'N/A'}. Ignorando por enquanto, esperando 'preapproval' ou 'subscription_preapproval'.`);
        return NextResponse.json({ received: true, message: "Notificação de pagamento recebida, aguardando evento de assinatura." }, { status: 200 });
    }

    // O Mercado Pago pode usar 'preapproval' ou 'subscription_preapproval' para o tópico/tipo de assinaturas
    if (effectiveNotificationType === 'preapproval' || effectiveNotificationType === 'subscription_preapproval') {
        console.log(`[WEBHOOK MP] Notificação de Assinatura (PreApproval/Subscription) recebida: ID=${effectiveResourceId}, Action=${legacyAction || 'N/A'}`);

        if (!effectiveResourceId) {
            console.warn("[WEBHOOK MP] Webhook de Assinatura sem ID de recurso (resourceId ou data.id).");
            return NextResponse.json({ received: true, message: "ID do recurso não encontrado na notificação de assinatura." }, { status: 200 });
        }

        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) {
            console.error("[WEBHOOK MP] ERRO CRÍTICO: MERCADO_PAGO_ACCESS_TOKEN NÃO ENCONTRADO NO AMBIENTE DO WEBHOOK!");
            return NextResponse.json({ error: 'Configuração interna do servidor (MP Token) incompleta.' }, { status: 500 });
        }
        console.log("[WEBHOOK MP] Access Token MP carregado.");

        const client = new MercadoPagoConfig({ accessToken: accessToken });
        const preapprovalClient = new PreApproval(client); // Usar PreApproval para buscar detalhes da assinatura
        
        console.log(`[WEBHOOK MP] Buscando detalhes da Assinatura (PreApproval) ID: ${effectiveResourceId}...`);
        const subscriptionDetails = await preapprovalClient.get({ id: effectiveResourceId });
        console.log("[WEBHOOK MP] Detalhes da assinatura MP:", JSON.stringify(subscriptionDetails, null, 2));

        const preapprovalIdFromDetails = subscriptionDetails?.id; // ID da assinatura retornado pela API do MP
        const statusFromDetails = subscriptionDetails?.status; // Status da assinatura (ex: 'authorized')
        const externalReferenceFromDetails = subscriptionDetails?.external_reference; // Sua referência (ex: 'negocio_ID_DO_NEGOCIO')

        if (!preapprovalIdFromDetails || !statusFromDetails || !externalReferenceFromDetails || !externalReferenceFromDetails.startsWith('negocio_')) {
            console.warn("[WEBHOOK MP] Dados insuficientes ou inválidos nos detalhes da assinatura MP para atualizar Supabase.", { 
                id: preapprovalIdFromDetails, 
                status: statusFromDetails, 
                external_reference: externalReferenceFromDetails 
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

        const { error: updateError } = await supabaseAdmin
            .from('negocios')
            .update(updateData)
            .eq('id', negocioId);
        console.log("[WEBHOOK MP] Query de update para Supabase executada.");

        if (updateError) {
            console.error(`[WEBHOOK MP] Erro ao atualizar Supabase para negocio ${negocioId} (PreApproval ID: ${preapprovalIdFromDetails}):`, updateError);
            return NextResponse.json({ received: true, error: "Falha ao atualizar DB" }, { status: 200 }); // Responde 200 para MP não reenviar
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
