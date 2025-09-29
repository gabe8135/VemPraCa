import { NextResponse } from "next/server";
import { Resend } from "resend";

const OWNER_EMAIL =
  process.env.WELCOME_OWNER_EMAIL || process.env.CONTACT_TO_EMAIL;
const FROM_EMAIL =
  process.env.WELCOME_FROM_EMAIL ||
  process.env.CONTACT_FROM_EMAIL ||
  "onboarding@resend.dev";

export async function POST(req) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        {
          error: "Serviço de e-mail não configurado (RESEND_API_KEY ausente).",
        },
        { status: 500 }
      );
    }
    const resend = new Resend(RESEND_API_KEY);
    const body = await req.json();
    const {
      nome, // nome do usuário (opcional)
      email, // email do usuário (para enviar felicitações)
      nomeNegocio,
      cidade,
      telefone,
      whatsapp,
      website,
    } = body || {};

    if (!nomeNegocio) {
      return NextResponse.json(
        { error: "Campo obrigatório: nomeNegocio." },
        { status: 400 }
      );
    }
    if (!OWNER_EMAIL) {
      return NextResponse.json(
        {
          error: "Configuração ausente: WELCOME_OWNER_EMAIL/CONTACT_TO_EMAIL.",
        },
        { status: 500 }
      );
    }

    // E-mail para o dono (você)
    const SITE_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://vempracaapp.com";
    const LOGO_URL =
      process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ||
      "https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site/LETREIRO.png";
    const ownerSubject = `Novo negócio cadastrado — ${nomeNegocio}`;
    const ownerHtml = `
      <div style="font-family: Inter,Arial,sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:20px 24px; background:linear-gradient(90deg,#059669,#047857); color:#fff;">
              <table width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="text-align:left;">
                    <img src="${LOGO_URL}" alt="VemPraCá" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;"/>
                  </td>
                  <td style="text-align:right;font-weight:600;">Novo cadastro de negócio</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 12px; font-size:20px;">Detalhes do cadastro</h2>
              <p style="margin:0 0 8px;"><strong>Nome do negócio:</strong> ${escapeHtml(nomeNegocio)}</p>
              ${cidade ? `<p style="margin:0 0 8px;"><strong>Cidade:</strong> ${escapeHtml(cidade)}</p>` : ""}
              ${telefone ? `<p style=\"margin:0 0 8px;\"><strong>Telefone:</strong> ${escapeHtml(telefone)}</p>` : ""}
              ${whatsapp ? `<p style=\"margin:0 0 8px;\"><strong>WhatsApp:</strong> ${escapeHtml(whatsapp)}</p>` : ""}
              ${website ? `<p style=\"margin:0 0 8px;\"><strong>Website:</strong> ${escapeHtml(website)}</p>` : ""}
              <hr style="margin:12px 0;border:none;height:1px;background:#e2e8f0;"/>
              ${email ? `<p style=\"margin:0 0 8px;\"><strong>E-mail do responsável:</strong> ${escapeHtml(email)}</p>` : ""}
              ${nome ? `<p style=\"margin:0 0 8px;\"><strong>Nome do responsável:</strong> ${escapeHtml(nome)}</p>` : ""}
              <p style="font-size:12px;color:#64748b;margin-top:12px;">Enviado automaticamente pelo site após cadastro de negócio.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px; background:#0f172a; color:#e2e8f0; font-size:12px;">
              <table width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="text-align:left;">© VemPraCá↗</td>
                  <td style="text-align:right;"><a href="${SITE_URL}" style="color:#a7f3d0; text-decoration:none;">vempracaapp.com</a></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: ownerSubject,
      html: ownerHtml,
    });

    // E-mail de boas-vindas para o cliente (se houver email)
    if (email) {
      const clientSubject = `Bem-vindo(a)! Seu cadastro no VemPraCá foi recebido`;
      const clientHtml = `
        <div style="font-family: Inter,Arial,sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:20px 24px; background:linear-gradient(90deg,#059669,#047857); color:#fff;">
                <table width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="text-align:left;">
                      <img src="${LOGO_URL}" alt="VemPraCá" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;"/>
                    </td>
                    <td style="text-align:right;font-weight:600;">Cadastro recebido</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px; font-size:20px;">Olá${nome ? `, ${escapeHtml(nome)}` : ""}!</h2>
                <p>Parabéns pelo cadastro do seu negócio <strong>${escapeHtml(nomeNegocio)}</strong> no VemPraCá.</p>
                ${cidade ? `<p>Local: ${escapeHtml(cidade)}</p>` : ""}
                <p>Em breve entraremos em contato para os próximos passos.</p>
                <p style="margin-top:16px;">Abraços,<br/><strong>Equipe VemPraCá↗</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px; background:#0f172a; color:#e2e8f0; font-size:12px;">
                <table width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="text-align:left;">© VemPraCá↗</td>
                    <td style="text-align:right;"><a href="${SITE_URL}" style="color:#a7f3d0; text-decoration:none;">vempracaapp.com</a></td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>`;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: clientSubject,
        html: clientHtml,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/negocios/welcome error", err);
    return NextResponse.json(
      { error: "Falha ao enviar e-mails." },
      { status: 500 }
    );
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
