import { env } from '../config/env'

type EmailPayload = {
  to: string
  subject: string
  html: string
}

async function sendViaResend(payload: EmailPayload): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Resend error:', err)
    return false
  }

  return true
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (env.RESEND_API_KEY) {
    return sendViaResend(payload)
  }

  // Dev fallback: log to console
  console.log('========== EMAIL (dev) ==========')
  console.log(`To: ${payload.to}`)
  console.log(`Subject: ${payload.subject}`)
  console.log(payload.html.replace(/<[^>]*>/g, ''))
  console.log('=================================')
  return true
}

// ── Base template ──

const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FanDreams</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0c0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0c0f;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #141419; border-radius: 12px; border: 1px solid #23232d;">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid #23232d;">
              <span style="font-size: 24px; font-weight: 800; color: #e11d48; letter-spacing: -0.5px;">FanDreams</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; border-top: 1px solid #23232d; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #6b6b7b;">
                Voce recebeu este email porque tem uma conta no FanDreams.
              </p>
              <a href="${appUrl}" style="font-size: 12px; color: #e11d48; text-decoration: none;">fandreams.app</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(text: string, href: string): string {
  return `<a href="${href}" style="display: inline-block; background: #e11d48; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; text-align: center;">${text}</a>`
}

function heading(text: string): string {
  return `<h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #f0f0f5;">${text}</h2>`
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #b0b0c0;">${text}</p>`
}

function highlight(text: string): string {
  return `<span style="color: #f0f0f5; font-weight: 600;">${text}</span>`
}

function infoBox(text: string): string {
  return `<div style="background: #1a1a23; border: 1px solid #23232d; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0; font-size: 14px; color: #b0b0c0; line-height: 1.5;">${text}</p>
  </div>`
}

function divider(): string {
  return `<hr style="border: none; border-top: 1px solid #23232d; margin: 24px 0;" />`
}

// ── Email functions ──

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const verifyUrl = `${appUrl}/verify-email?token=${token}`

  return sendEmail({
    to,
    subject: 'Verifique seu email - FanDreams',
    html: baseTemplate(`
      ${heading('Verifique seu email')}
      ${paragraph('Para completar seu cadastro no FanDreams, confirme seu endereco de email clicando no botao abaixo.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Verificar Email', verifyUrl)}
      </div>
      ${infoBox(`Ou copie e cole este link no navegador:<br /><a href="${verifyUrl}" style="color: #e11d48; word-break: break-all; font-size: 13px;">${verifyUrl}</a>`)}
      ${paragraph(`Este link expira em ${highlight('24 horas')}.`)}
    `),
  })
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  return sendEmail({
    to,
    subject: 'Redefinir senha - FanDreams',
    html: baseTemplate(`
      ${heading('Redefinir sua senha')}
      ${paragraph('Voce solicitou a redefinicao de senha da sua conta FanDreams. Clique no botao abaixo para criar uma nova senha.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Redefinir Senha', resetUrl)}
      </div>
      ${infoBox(`Ou copie e cole este link no navegador:<br /><a href="${resetUrl}" style="color: #e11d48; word-break: break-all; font-size: 13px;">${resetUrl}</a>`)}
      ${paragraph(`Este link expira em ${highlight('1 hora')}. Se voce nao solicitou esta redefinicao, ignore este email — sua senha permanece inalterada.`)}
    `),
  })
}

export async function sendWelcomeEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Bem-vindo ao FanDreams, ${displayName}!`,
    html: baseTemplate(`
      ${heading(`Bem-vindo, ${displayName}! 🎉`)}
      ${paragraph('Estamos muito felizes em ter voce no FanDreams! Aqui voce pode acompanhar seus criadores favoritos, acessar conteudo exclusivo e fazer parte de uma comunidade incrivel.')}
      ${divider()}
      ${paragraph(`${highlight('O que voce pode fazer agora:')}`)}<ul style="margin: 0 0 16px; padding-left: 20px; color: #b0b0c0; font-size: 14px; line-height: 2;">
        <li>Explore criadores na aba ${highlight('Descobrir')}</li>
        <li>Siga seus criadores favoritos</li>
        <li>Assine para acessar conteudo exclusivo</li>
        <li>Envie mensagens diretas para criadores</li>
      </ul>
      <div style="text-align: center; margin: 28px 0;">
        ${button('Explorar FanDreams', `${appUrl}/explore`)}
      </div>
      ${paragraph('Se tiver qualquer duvida, estamos aqui para ajudar!')}
    `),
  })
}

export async function sendPaymentConfirmedEmail(
  to: string,
  data: { type: string; amount: string; description: string },
): Promise<boolean> {
  const typeLabels: Record<string, string> = {
    ppv: 'Conteudo PPV',
    fancoin_purchase: 'Compra de FanCoins',
    subscription: 'Assinatura',
    tip: 'Gorjeta',
  }

  const typeLabel = typeLabels[data.type] || 'Pagamento'

  return sendEmail({
    to,
    subject: `Pagamento confirmado - ${typeLabel} - FanDreams`,
    html: baseTemplate(`
      ${heading('Pagamento confirmado')}
      ${paragraph('Seu pagamento foi processado com sucesso!')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a23; border: 1px solid #23232d; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Tipo</span><br />
            <span style="font-size: 15px; color: #f0f0f5; font-weight: 600;">${typeLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Descricao</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${data.description}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px;">
            <span style="font-size: 13px; color: #6b6b7b;">Valor</span><br />
            <span style="font-size: 20px; color: #22c55e; font-weight: 700;">R$ ${data.amount}</span>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin: 28px 0;">
        ${button('Ver minha conta', `${appUrl}/wallet`)}
      </div>
    `),
  })
}

export async function sendSubscriptionActivatedEmail(
  to: string,
  data: { creatorName: string; price: string; periodEnd: string; isPromo?: boolean; durationLabel?: string },
): Promise<boolean> {
  const periodLabel = data.isPromo && data.durationLabel
    ? `Plano promocional de ${data.durationLabel}`
    : 'Assinatura mensal'

  return sendEmail({
    to,
    subject: `Assinatura ativada - ${data.creatorName} - FanDreams`,
    html: baseTemplate(`
      ${heading('Assinatura ativada!')}
      ${paragraph(`Sua assinatura de ${highlight(data.creatorName)} esta ativa. Aproveite todo o conteudo exclusivo!`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a23; border: 1px solid #23232d; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Criador</span><br />
            <span style="font-size: 15px; color: #f0f0f5; font-weight: 600;">${data.creatorName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Plano</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${periodLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Valor</span><br />
            <span style="font-size: 15px; color: #f0f0f5; font-weight: 600;">R$ ${data.price}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px;">
            <span style="font-size: 13px; color: #6b6b7b;">Acesso ate</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${data.periodEnd}</span>
          </td>
        </tr>
      </table>
      <div style="text-align: center; margin: 28px 0;">
        ${button('Ver conteudo', `${appUrl}/feed`)}
      </div>
    `),
  })
}

export async function sendSubscriptionCancelledEmail(
  to: string,
  data: { creatorName: string; accessUntil: string },
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Assinatura cancelada - ${data.creatorName} - FanDreams`,
    html: baseTemplate(`
      ${heading('Assinatura cancelada')}
      ${paragraph(`Sua assinatura de ${highlight(data.creatorName)} foi cancelada conforme solicitado.`)}
      ${infoBox(`Seu acesso ao conteudo exclusivo continua ativo ate ${highlight(data.accessUntil)}. Apos essa data, nenhuma nova cobranca sera realizada.`)}
      ${paragraph('Voce pode reassinar a qualquer momento voltando ao perfil do criador.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Explorar criadores', `${appUrl}/explore`)}
      </div>
    `),
  })
}

export async function sendNewMessageEmail(
  to: string,
  data: { senderName: string; preview: string },
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Nova mensagem de ${data.senderName} - FanDreams`,
    html: baseTemplate(`
      ${heading('Nova mensagem')}
      ${paragraph(`${highlight(data.senderName)} te enviou uma mensagem:`)}
      ${infoBox(`"${data.preview.length > 150 ? data.preview.substring(0, 150) + '...' : data.preview}"`)}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Responder', `${appUrl}/messages`)}
      </div>
    `),
  })
}

export async function sendKycApprovedEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Verificacao de identidade aprovada - FanDreams',
    html: baseTemplate(`
      ${heading('Verificacao aprovada! ✅')}
      ${paragraph(`Parabens, ${highlight(displayName)}! Sua verificacao de identidade (KYC) foi aprovada com sucesso.`)}
      ${paragraph('Agora voce tem acesso completo a todas as funcionalidades da plataforma, incluindo saques e pagamentos.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Ir para o Dashboard', `${appUrl}/creator/dashboard`)}
      </div>
    `),
  })
}

export async function sendWithdrawalOtpEmail(to: string, code: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Codigo de verificacao para saque - FanDreams`,
    html: baseTemplate(`
      ${heading('Codigo de verificacao')}
      ${paragraph('Voce solicitou um saque na sua conta FanDreams. Use o codigo abaixo para confirmar a operacao:')}
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: #1a1a23; border: 2px solid #e11d48; border-radius: 12px; padding: 20px 40px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f0f0f5; font-family: 'Courier New', monospace;">${code}</span>
        </div>
      </div>
      ${infoBox(`Este codigo expira em ${highlight('10 minutos')}. Nao compartilhe com ninguem.`)}
      ${paragraph('Se voce nao solicitou este saque, ignore este email e entre em contato com o suporte imediatamente.')}
    `),
  })
}

export async function sendContactNotificationEmail(data: {
  name: string
  email: string
  whatsapp?: string
  message: string
}): Promise<boolean> {
  const whatsappRow = data.whatsapp
    ? `<tr><td style="padding: 12px 16px; border-bottom: 1px solid #23232d;"><span style="font-size: 13px; color: #6b6b7b;">WhatsApp</span><br /><span style="font-size: 15px; color: #f0f0f5;">${data.whatsapp}</span></td></tr>`
    : ''

  return sendEmail({
    to: 'contato@fandreams.app',
    subject: `Nova mensagem de contato - ${data.name}`,
    html: baseTemplate(`
      ${heading('Nova mensagem de contato')}
      ${paragraph('Uma nova mensagem foi enviada pelo formulario de contato da plataforma.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a23; border: 1px solid #23232d; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Nome</span><br />
            <span style="font-size: 15px; color: #f0f0f5; font-weight: 600;">${data.name}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">E-mail</span><br />
            <a href="mailto:${data.email}" style="font-size: 15px; color: #e11d48; text-decoration: none;">${data.email}</a>
          </td>
        </tr>
        ${whatsappRow}
        <tr>
          <td style="padding: 12px 16px;">
            <span style="font-size: 13px; color: #6b6b7b;">Mensagem</span><br />
            <span style="font-size: 15px; color: #f0f0f5; line-height: 1.6; white-space: pre-wrap;">${data.message}</span>
          </td>
        </tr>
      </table>
      ${paragraph('Responda diretamente para o e-mail do remetente acima.')}
    `),
  })
}

export async function sendContactConfirmationEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Mensagem recebida - FanDreams',
    html: baseTemplate(`
      ${heading(`Obrigado, ${name}!`)}
      ${paragraph('Sua mensagem foi recebida com sucesso. Nossa equipe ira analisar e responder o mais breve possivel.')}
      ${divider()}
      ${paragraph(`${highlight('Canais oficiais de contato:')}`)}
      <ul style="margin: 0 0 16px; padding-left: 20px; color: #b0b0c0; font-size: 14px; line-height: 2;">
        <li>invest@fandream.app</li>
        <li>contato@fandream.app</li>
        <li>dpo@fandream.app</li>
      </ul>
      ${paragraph('Atenciosamente, Equipe FanDreams.')}
    `),
  })
}

export async function sendKycRejectedEmail(
  to: string,
  data: { displayName: string; reason?: string },
): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Verificacao de identidade recusada - FanDreams',
    html: baseTemplate(`
      ${heading('Verificacao recusada')}
      ${paragraph(`${highlight(data.displayName)}, infelizmente sua verificacao de identidade (KYC) nao foi aprovada.`)}
      ${data.reason ? infoBox(`${highlight('Motivo:')} ${data.reason}`) : ''}
      ${paragraph('Voce pode enviar novos documentos para uma nova analise. Certifique-se de que as imagens estejam nítidas e os dados visiveis.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Enviar novos documentos', `${appUrl}/settings`)}
      </div>
      ${paragraph('Se precisar de ajuda, entre em contato com nosso suporte.')}
    `),
  })
}

// ── Account Management Emails ──

export async function sendAccountDeactivatedEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Conta desativada - FanDreams',
    html: baseTemplate(`
      ${heading('Conta desativada')}
      ${paragraph(`${highlight(displayName)}, sua conta foi desativada conforme solicitado.`)}
      ${paragraph('Enquanto sua conta estiver desativada:')}
      <ul style="margin: 0 0 16px; padding-left: 20px; color: #b0b0c0; font-size: 14px; line-height: 2;">
        <li>Seu perfil nao sera visivel para outros usuarios</li>
        <li>Suas assinaturas permanecem ativas</li>
        <li>Voce pode reativar sua conta a qualquer momento fazendo login</li>
      </ul>
      <div style="text-align: center; margin: 28px 0;">
        ${button('Reativar conta', `${appUrl}/login`)}
      </div>
    `),
  })
}

export async function sendAccountReactivatedEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Conta reativada - FanDreams',
    html: baseTemplate(`
      ${heading('Bem-vindo de volta!')}
      ${paragraph(`${highlight(displayName)}, sua conta foi reativada com sucesso.`)}
      ${paragraph('Tudo esta como voce deixou. Explore novos conteudos e aproveite a plataforma!')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Ir para o Feed', `${appUrl}/feed`)}
      </div>
    `),
  })
}

export async function sendAccountDeletionScheduledEmail(to: string, displayName: string, deletionDate: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Exclusao de conta agendada - FanDreams',
    html: baseTemplate(`
      ${heading('Exclusao de conta agendada')}
      ${paragraph(`${highlight(displayName)}, sua solicitacao de exclusao de conta foi registrada.`)}
      ${infoBox(`Sua conta e todos os dados associados serao excluidos permanentemente em ${highlight(deletionDate)}.`)}
      ${paragraph('Ate essa data, voce pode cancelar a exclusao fazendo login na plataforma.')}
      ${paragraph(`${highlight('Atencao:')} Apos a exclusao, esta acao nao podera ser desfeita. Todos os seus dados, conteudos e assinaturas serao removidos permanentemente.`)}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Cancelar exclusao', `${appUrl}/login`)}
      </div>
    `),
  })
}

export async function sendAccountDeletedEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Conta excluida - FanDreams',
    html: baseTemplate(`
      ${heading('Conta excluida')}
      ${paragraph(`${highlight(displayName)}, sua conta FanDreams foi excluida permanentemente conforme agendado.`)}
      ${paragraph('Todos os dados associados a sua conta foram removidos.')}
      ${paragraph('Se desejar, voce pode criar uma nova conta a qualquer momento.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Criar nova conta', `${appUrl}/register`)}
      </div>
    `),
  })
}

// ── Admin Notification Emails ──

const adminEmails = env.ADMIN_NOTIFICATION_EMAILS
  ? env.ADMIN_NOTIFICATION_EMAILS.split(',').map((e: string) => e.trim()).filter(Boolean)
  : []

async function sendToAdmins(subject: string, html: string): Promise<void> {
  for (const email of adminEmails) {
    sendEmail({ to: email, subject, html }).catch((e) =>
      console.error(`Failed to send admin email to ${email}:`, e),
    )
  }
}

export async function sendNewSignupAlert(data: { username: string; email: string; displayName: string }): Promise<void> {
  if (adminEmails.length === 0) return

  await sendToAdmins(
    `Novo cadastro: ${data.username} - FanDreams`,
    baseTemplate(`
      ${heading('Novo usuario cadastrado')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a23; border: 1px solid #23232d; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Username</span><br />
            <span style="font-size: 15px; color: #f0f0f5; font-weight: 600;">@${data.username}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Nome</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${data.displayName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px;">
            <span style="font-size: 13px; color: #6b6b7b;">E-mail</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${data.email}</span>
          </td>
        </tr>
      </table>
      ${paragraph(`Registrado em ${highlight(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}.`)}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Ver painel admin', `${appUrl}/admin`)}
      </div>
    `),
  )
}

export async function sendNewKycSubmissionAlert(data: { username: string; email: string; displayName: string; documentId: string }): Promise<void> {
  if (adminEmails.length === 0) return

  await sendToAdmins(
    `Nova solicitacao KYC: ${data.username} - FanDreams`,
    baseTemplate(`
      ${heading('Nova solicitacao de verificacao KYC')}
      ${paragraph('Um usuario enviou documentos para verificacao de identidade.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a23; border: 1px solid #23232d; border-radius: 8px; margin: 16px 0;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Username</span><br />
            <span style="font-size: 15px; color: #f0f0f5; font-weight: 600;">@${data.username}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #23232d;">
            <span style="font-size: 13px; color: #6b6b7b;">Nome</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${data.displayName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px;">
            <span style="font-size: 13px; color: #6b6b7b;">E-mail</span><br />
            <span style="font-size: 15px; color: #f0f0f5;">${data.email}</span>
          </td>
        </tr>
      </table>
      ${paragraph('Revise os documentos no painel de administracao.')}
      <div style="text-align: center; margin: 28px 0;">
        ${button('Revisar KYC', `${appUrl}/admin/kyc`)}
      </div>
    `),
  )
}

// ── 2FA OTP Email ──

export async function send2faOtpEmail(to: string, code: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Codigo de verificacao de login - FanDreams`,
    html: baseTemplate(`
      ${heading('Codigo de verificacao')}
      ${paragraph('Alguem esta tentando fazer login na sua conta FanDreams. Use o codigo abaixo para confirmar sua identidade:')}
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: #1a1a23; border: 2px solid #e11d48; border-radius: 12px; padding: 20px 40px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f0f0f5; font-family: 'Courier New', monospace;">${code}</span>
        </div>
      </div>
      ${infoBox(`Este codigo expira em ${highlight('10 minutos')}. Nao compartilhe com ninguem.`)}
      ${paragraph('Se voce nao tentou fazer login, altere sua senha imediatamente.')}
    `),
  })
}

export async function send2faEnabledEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Verificacao em duas etapas ativada - FanDreams',
    html: baseTemplate(`
      ${heading('2FA ativado')}
      ${paragraph(`${highlight(displayName)}, a verificacao em duas etapas foi ativada na sua conta.`)}
      ${paragraph('A partir de agora, sempre que fizer login, voce recebera um codigo de verificacao por email para confirmar sua identidade.')}
      ${infoBox('Se voce nao ativou esta funcionalidade, altere sua senha imediatamente e entre em contato com o suporte.')}
    `),
  })
}

export async function send2faDisabledEmail(to: string, displayName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Verificacao em duas etapas desativada - FanDreams',
    html: baseTemplate(`
      ${heading('2FA desativado')}
      ${paragraph(`${highlight(displayName)}, a verificacao em duas etapas foi desativada na sua conta.`)}
      ${paragraph('Sua conta agora sera acessada apenas com email e senha. Recomendamos manter o 2FA ativo para maior seguranca.')}
      ${infoBox('Se voce nao desativou esta funcionalidade, altere sua senha imediatamente e entre em contato com o suporte.')}
    `),
  })
}
