import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'

type Props = {
  firstName: string | null
  link: string
  intro: string
  message: string | null
}

// Les couleurs sont en dur : les clients e-mail n'interprètent ni les
// variables CSS ni les classes Tailwind du reste de l'application.
const COLORS = {
  primary: '#1F3D2B',
  accent: '#B8975A',
  background: '#FAF8F2',
  card: '#FFFFFF',
  border: '#E7E1D3',
  muted: '#6B6B6B',
}

export function InvitationEmail({ firstName, link, intro, message }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Votre accès à l&apos;espace Chopin Conditionnement</Preview>
      <Body style={{ backgroundColor: COLORS.background, margin: 0, padding: '32px 0', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', backgroundColor: COLORS.card, borderRadius: '12px', border: `1px solid ${COLORS.border}`, padding: '32px' }}>
          <Section style={{ textAlign: 'center', paddingBottom: '8px' }}>
            <Heading as="h1" style={{ color: COLORS.primary, fontSize: '30px', margin: 0, fontWeight: 400 }}>
              Chopin
            </Heading>
            <Text style={{ color: COLORS.muted, fontSize: '10px', letterSpacing: '2px', margin: '4px 0 0' }}>
              CONDITIONNEMENT
            </Text>
          </Section>

          <Hr style={{ borderColor: COLORS.border, margin: '24px 0' }} />

          <Text style={{ color: '#1A1A1A', fontSize: '15px', lineHeight: '24px', margin: 0 }}>
            {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
          </Text>

          <Text style={{ color: '#1A1A1A', fontSize: '15px', lineHeight: '24px' }}>
            SCEA Chopin Conditionnement vous invite à {intro}.
          </Text>

          {message && (
            <Section style={{ backgroundColor: COLORS.background, borderLeft: `3px solid ${COLORS.accent}`, padding: '12px 16px', margin: '16px 0' }}>
              <Text style={{ color: '#1A1A1A', fontSize: '14px', lineHeight: '22px', margin: 0, fontStyle: 'italic' }}>
                {message}
              </Text>
            </Section>
          )}

          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Link
              href={link}
              style={{
                backgroundColor: COLORS.primary, color: '#FFFFFF', fontSize: '15px',
                textDecoration: 'none', padding: '12px 28px', borderRadius: '8px',
                display: 'inline-block',
              }}
            >
              Activer mon accès
            </Link>
          </Section>

          <Text style={{ color: COLORS.muted, fontSize: '13px', lineHeight: '20px' }}>
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
            <br />
            <Link href={link} style={{ color: COLORS.primary, wordBreak: 'break-all' }}>{link}</Link>
          </Text>

          <Hr style={{ borderColor: COLORS.border, margin: '24px 0' }} />

          <Text style={{ color: COLORS.muted, fontSize: '12px', lineHeight: '18px', margin: 0 }}>
            Ce lien est personnel et expire dans 14 jours. Si vous n&apos;êtes pas
            concerné par cette invitation, ignorez simplement ce message.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default InvitationEmail
