'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type Props = {
  userId: string
  initialValues: {
    first_name: string
    last_name: string
    phone: string
  }
}

export function AccountForm({ userId, initialValues }: Props) {
  const [form, setForm] = useState(initialValues)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      toast.error('Erreur lors de la sauvegarde.')
    } else {
      toast.success('Profil mis à jour.')
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-5">
      <p className="font-serif text-lg text-foreground">Informations personnelles</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Prénom</Label>
          <Input
            value={form.first_name}
            onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
            placeholder="Prénom"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            placeholder="Nom de famille"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Téléphone</Label>
        <Input
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="+33 6 00 00 00 00"
          type="tel"
        />
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Enregistrement…' : 'Enregistrer'}
      </Button>
    </div>
  )
}
