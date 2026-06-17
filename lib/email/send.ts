// TODO étape 7 — Wrapper Resend avec error handling et logging
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendEmailParams = {
  to: string | string[]
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    react,
  })

  if (error) {
    console.error('[email] Failed to send:', { to, subject, error })
    throw new Error(`Email send failed: ${error.message}`)
  }

  return data
}
