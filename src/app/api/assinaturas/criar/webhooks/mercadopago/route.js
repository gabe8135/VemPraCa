// src/app/api/assinaturas/criar/webhooks/mercadopago/route.js
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { createClient } from '@supabase/supabase-js'; // Meu cliente Supabase padrão.

export async function POST(request) {
console.log("Webhook Mercado Pago recebido!");
  const startTime = Date.now(); // Para eu poder medir o tempo de processamento deste webhook.

try {
    const body = await request.json();
    console.log("Corpo do Webhook:", JSON.stringify(body, null, 2));

    // --- Minha inicialização do cliente Supabase Admin aqui dentro do handler ---
    // Preciso fazer isso aqui porque as variáveis de ambiente podem não estar disponíveis no escopo global em serverless functions.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabaseAdmin;

    if (supabaseUrl && supabaseServiceKey) {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        console.log("Webhook MP: Cliente Supabase Admin inicializado com sucesso aqui no handler.");
    } else {
        // Log para me ajudar a debugar se alguma variável de ambiente do Supabase estiver faltando.
        if (!supabaseUrl) console.error("Webhook MP: NEXT_PUBLIC_SUPABASE_URL NÃO ENCONTRADA!");
        if (!supabaseServiceKey) console.error("Webhook MP: SUPABASE_SERVICE_ROLE_KEY NÃO ENCONTRADA!");
    }

    // Validação se o cliente foi criado com sucesso
    if (!supabaseAdmin) {
        console.error("Webhook MP: Falha ao inicializar Cliente Supabase Admin.");
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
        console.log(`Notificação de Payment recebida: ID=${dataId}, Action=${notificationAction}. Ignorando por enquanto, esperando 'preapproval'.`);
        // Por agora, vou focar apenas na notificação 'preapproval'.
        return NextResponse.json({ received: true, message: "Notificação de pagamento recebida, aguardando preapproval." }, { status: 200 });
    }

    if (notificationType === 'preapproval') {
        console.log(`Notificação de PreApproval recebida: ID=${dataId}, Action=${notificationAction}`);

        if (!dataId) {
            console.warn("Webhook PreApproval sem data.id");
            return NextResponse.json({ received: true, message: "ID não encontrado" }, { status: 200 });
        }

        // Preciso buscar os detalhes da assinatura lá no Mercado Pago para pegar o status e a external_reference.
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (!accessToken) {
            console.error("Webhook MP: Access Token MP não configurado.");
            // Isso é um erro de configuração, então retorno 500.
            return NextResponse.json({ error: 'Configuração interna do servidor (MP Token) incompleta.' }, { status: 500 });
        }

        const client = new MercadoPagoConfig({ accessToken: accessToken });
        const preapproval = new PreApproval(client);

        console.log(`Buscando detalhes da PreApproval ID: ${dataId}...`);
        const subscriptionDetails = await preapproval.get({ id: dataId });
        console.log("Detalhes da assinatura MP:", JSON.stringify(subscriptionDetails, null, 2));

        const preapprovalId = subscriptionDetails?.id;
        const status = subscriptionDetails?.status;
        const externalReference = subscriptionDetails?.external_reference; // Minha referência externa, tipo "negocio_ID_DO_MEU_NEGOCIO".

        // Validação importante dos dados que vieram da API do MP.
        if (!preapprovalId || !status || !externalReference || !externalReference.startsWith('negocio_')) {
            console.warn("Dados insuficientes ou inválidos nos detalhes da assinatura MP para atualizar Supabase.", { preapprovalId, status, externalReference });
            // Respondo 200 OK para o MP não ficar tentando de novo, mas registro o aviso. Não dá pra atualizar o banco assim.
            return NextResponse.json({ received: true, message: "Dados insuficientes ou inválidos da API MP." }, { status: 200 });
        }

        const negocioId = externalReference.split('negocio_')[1];
        if (!negocioId) {
            console.warn("Não foi possível extrair negocioId da external_reference:", externalReference);
             // Mesma coisa: 200 OK para o MP, mas aviso que não consegui extrair o ID do negócio.
            return NextResponse.json({ received: true, message: "NegocioId não extraído da external_reference." }, { status: 200 });
        }

        console.log(`Atualizando Supabase para negocioId: ${negocioId}, PreApproval ID: ${preapprovalId}, Status: ${status}`);

        // Agora sim, atualizo o negócio lá no Supabase.
        const { error: updateError } = await supabaseAdmin
            .from('negocios')
            .update({
                preapproval_id: preapprovalId,
                status_assinatura: status,
                // data_atualizacao: new Date().toISOString() // Poderia atualizar a data aqui também, se quisesse.
            })
            .eq('id', negocioId); // Uso o ID do negócio que extraí da external_reference.

        if (updateError) {
            console.error(`Erro ao atualizar Supabase via Webhook para negocio ${negocioId} (PreApproval ID: ${preapprovalId}):`, updateError);
            // Respondo 200 para o MP não reenviar, mas registro o erro interno.
            return NextResponse.json({ received: true, error: "Falha ao atualizar DB" }, { status: 200 });
        }

        console.log(`Supabase atualizado com sucesso para negocio ${negocioId}. Tempo: ${Date.now() - startTime}ms`);
        return NextResponse.json({ received: true }, { status: 200 });

    } else {
        console.log(`Tipo de notificação não tratado: ${notificationType}. Tempo: ${Date.now() - startTime}ms`);
        return NextResponse.json({ received: true, message: "Tipo não tratado" }, { status: 200 });
    }

} catch (error) {
    // Log para qualquer erro geral que acontecer no processamento.
    console.error(`Erro GERAL ao processar Webhook Mercado Pago. Tempo: ${Date.now() - startTime}ms`, error);
    // Retorno 500 para indicar que algo deu errado do meu lado.
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 500 });
}
}
