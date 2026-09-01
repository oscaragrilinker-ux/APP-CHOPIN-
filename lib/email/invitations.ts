import { sendEmail } from './send'
import { InvitationEmail } from '@/emails/InvitationEmail'
import type { Role } from '@/lib/permissions'

const ROLE_INTRO: Record<Role, string> = {
  admin:           'accéder à la gestion complète de l\'exploitation',
  secretaire:      'suivre les commandes, le transport, la facturation et les relances',
  responsable_conditionnement: 'piloter la préparation des commandes en atelier',
  conditionnement: 'suivre la préparation des commandes',
  client_pro:      'consulter notre catalogue et nous adresser vos offres',
  super_admin:     'accéder à l\'application',
}

export async function sendInvitationEmail(params: {
  to: string
  link: string
  role: Role
  firstName: string | null
  message: string | null
}) {
  const isClient = params.role === 'client_pro'

  return sendEmail({
    to: params.to,
    subject: isClient
      ? 'Votre accès à l\'espace professionnel Chopin Conditionnement'
      : 'Votre accès à l\'application Chopin Conditionnement',
    react: InvitationEmail({
      firstName: params.firstName,
      link: params.link,
      intro: ROLE_INTRO[params.role],
      message: params.message,
    }),
  })
}
