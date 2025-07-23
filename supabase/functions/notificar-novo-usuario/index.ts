// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  const { record } = await req.json();
  const userId = record.id;

  // Busca dados do perfil na tabela profiles
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });
  const profileData = await profileRes.json();
  const nome = profileData[0]?.nome_proprietario ?? "Nome não informado";
  const email = profileData[0]?.email ?? "Email não informado";

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  const mensagem = `🚀 Novo usuário cadastrado na plataforma VemPraCa!\n\n👤 Nome: ${nome}\n✉️ Email: ${email}`;

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensagem,
    }),
  });

  const data = await response.json();
  console.log("Resposta do Telegram:", data);

  return new Response("Notificação enviada com sucesso!", { status: 200 });
});


/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:0/functions/v1/notificar-novo-usuario' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
