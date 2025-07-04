// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-ignore
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

serve(async (req) => {
  const { record } = await req.json();
  const nome = record.nome ?? "Nome não informado";
  const proprietario = record.proprietario ?? "Proprietário não informado";

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  const mensagem = `🏢 Novo negócio cadastrado!\n\n📛 Nome: ${nome}\n👤 Proprietário: ${proprietario}`;

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensagem
    })
  });

  return new Response("Alerta de novo negócio enviado com sucesso!", { status: 200 });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:0/functions/v1/notificar-novo-negocio' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
