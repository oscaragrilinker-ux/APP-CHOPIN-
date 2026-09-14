'use client'

import { useState } from 'react'
import { siteConfig } from '@/site.config'

type FormState = 'idle' | 'sending' | 'success' | 'error'

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(data: FormData): Record<string, string> {
    const e: Record<string, string> = {}
    if (!data.get('name')) e.name = 'Ce champ est requis.'
    const email = String(data.get('email') ?? '')
    if (!email) {
      e.email = 'Ce champ est requis.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Adresse email invalide.'
    }
    if (!data.get('message')) e.message = 'Ce champ est requis.'
    return e
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    // Honeypot anti-spam
    if (data.get('_gotcha')) return

    const validationErrors = validate(data)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setFormState('sending')

    try {
      const res = await fetch(`https://formspree.io/f/${siteConfig.formspreeId}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (res.ok) {
        setFormState('success')
        form.reset()
      } else {
        setFormState('error')
      }
    } catch {
      setFormState('error')
    }
  }

  if (formState === 'success') {
    return (
      <div className="border border-gold/30 bg-cream p-10 text-center space-y-3">
        <p className="font-serif text-2xl text-forest">Message envoyé</p>
        <div className="h-px w-8 bg-gold/50 mx-auto" aria-hidden="true" />
        <p className="text-sm text-ink/70">
          Merci, votre message a bien été envoyé. Nous reviendrons vers vous rapidement.
        </p>
      </div>
    )
  }

  const inputBase = 'w-full px-4 py-3 bg-cream border text-ink text-sm focus:outline-none transition-colors'
  const inputNormal = 'border-creamMuted focus:border-gold'
  const inputError  = 'border-red-400 focus:border-red-400'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {/* Nom */}
      <div>
        <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1.5 font-sans">
          Nom <span className="text-gold" aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          aria-required="true"
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={`${inputBase} ${errors.name ? inputError : inputNormal}`}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      {/* Société */}
      <div>
        <label htmlFor="company" className="block text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1.5 font-sans">
          Société
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          className={`${inputBase} ${inputNormal}`}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1.5 font-sans">
          Email <span className="text-gold" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-required="true"
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      {/* Téléphone */}
      <div>
        <label htmlFor="phone" className="block text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1.5 font-sans">
          Téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className={`${inputBase} ${inputNormal}`}
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-[10px] uppercase tracking-[0.2em] text-ink/60 mb-1.5 font-sans">
          Message <span className="text-gold" aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          aria-required="true"
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={`${inputBase} ${errors.message ? inputError : inputNormal} resize-none`}
        />
        {errors.message && (
          <p id="message-error" role="alert" className="text-red-500 text-xs mt-1">{errors.message}</p>
        )}
      </div>

      {/* Erreur réseau */}
      {formState === 'error' && (
        <p role="alert" className="text-red-600 text-sm">
          Une erreur est survenue, réessayez ou écrivez-nous directement à{' '}
          <a href={`mailto:${siteConfig.contactEmail}`} className="underline hover:text-red-800">
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={formState === 'sending'}
        className="w-full h-12 bg-gold text-white text-[11px] uppercase tracking-[0.25em] font-sans hover:bg-gold/90 transition-colors disabled:opacity-60"
      >
        {formState === 'sending' ? 'Envoi en cours…' : 'Envoyer le message'}
      </button>
    </form>
  )
}
