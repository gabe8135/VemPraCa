import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Configurações via env
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL; // obrigatório
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev"; // remetente verificado recomendado
const CONTACT_AUTOREPLY_ENABLED =
  (process.env.CONTACT_AUTOREPLY_ENABLED || "true").toLowerCase() === "true";
const CONTACT_AUTOREPLY_FROM =
  process.env.CONTACT_AUTOREPLY_FROM || CONTACT_FROM_EMAIL;

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body;
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.json().catch(() => ({}));
    }

    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim();
    const mensagem = String(body.mensagem || "").trim();

    if (!nome || !email || !mensagem) {
      return NextResponse.json(
        { error: "Campos obrigatórios: nome, email, mensagem." },
        { status: 400 }
      );
    }
    if (!CONTACT_TO_EMAIL) {
      return NextResponse.json(
        { error: "Configuração ausente: CONTACT_TO_EMAIL." },
        { status: 500 }
      );
    }

    // E-mail para o proprietário
    const ownerSubject = `Novo contato pelo site — ${nome}`;
    const SITE_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://vempracaapp.com";
    const LOGO_URL =
      process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ||
      "https://zrrqlmmecqfbobiblzkb.supabase.co/storage/v1/object/public/imagens-site/LETREIRO.png";
    const ownerHtml = `
      <div style="font-family: Inter, Arial, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:20px 24px; background:linear-gradient(90deg,#059669,#047857); color:#fff;">
              <table width="100%" style="border-collapse:collapse;">
                <tr>
                  <td style="text-align:left;">
                    <img src="${LOGO_URL}" alt="VemPraCá" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;"/>
                  </td>
                  <td style="text-align:right;font-weight:600;">Novo contato</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <h2 style="margin:0 0 12px; font-size:20px;">Você recebeu uma nova mensagem</h2>
              <p style="margin:0 0 8px;"><strong>Nome:</strong> ${escapeHtml(nome)}</p>
              <p style="margin:0 0 8px;"><strong>E-mail:</strong> ${escapeHtml(email)}</p>
              <p style="margin:12px 0 6px;"><strong>Mensagem:</strong></p>
              <div style="white-space:pre-wrap; background:#f1f5f9; padding:12px; border-radius:10px;">${escapeHtml(mensagem)}</div>
              <p style="font-size:12px; color:#64748b; margin-top:16px;">Enviado pelo formulário de contato do site.</p>
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
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      reply_to: email,
      subject: ownerSubject,
      html: ownerHtml,
    });

    // Auto-reply para o remetente
    if (CONTACT_AUTOREPLY_ENABLED) {
      const replySubject = `Recebemos sua mensagem — VemPraCá`;
      const replyHtml = `
        <div style="font-family: Inter, Arial, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:20px 24px; background:linear-gradient(90deg,#059669,#047857); color:#fff;">
                <table width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="text-align:left;">
                      <img src="${LOGO_URL}" alt="VemPraCá" style="display:block;border:0;outline:none;text-decoration:none;width:120px;height:auto;"/>
                    </td>
                    <td style="text-align:right;font-weight:600;">Recebemos sua mensagem</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 12px; font-size:20px;">Olá, ${escapeHtml(nome)}!</h2>
                <p>Recebemos sua mensagem e em breve entraremos em contato.</p>
                <p style="margin-top:12px;">Resumo do que você enviou:</p>
                <blockquote style="margin:8px 0; padding:12px; background:#f1f5f9; border-radius:10px; white-space:pre-wrap;">${escapeHtml(mensagem)}</blockquote>
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
        from: CONTACT_AUTOREPLY_FROM,
        to: email,
        subject: replySubject,
        html: replyHtml,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/contact error", err);
    return NextResponse.json(
      { error: "Falha ao enviar. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
