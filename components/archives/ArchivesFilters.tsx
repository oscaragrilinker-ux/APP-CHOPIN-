'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Company = { id: string; name: string }

type Props = {
  companies: Company[]
  q?: string
  companyId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function ArchivesFilters({
  companies,
  q: initQ = '',
  companyId: initCompany = '',
  status: initStatus = '',
  dateFrom: initFrom = '',
  dateTo: initTo = '',
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [form, setForm] = useState({
    q: initQ,
    company: initCompany,
    status: initStatus,
    from: initFrom,
    to: initTo,
  })

  function apply(overrides?: Partial<typeof form>) {
    const data = { ...form, ...overrides }
    const params = new URLSearchParams()
    if (data.q)       params.set('q',       data.q)
    if (data.company) params.set('company', data.company)
    if (data.status)  params.set('status',  data.status)
    if (data.from)    params.set('from',    data.from)
    if (data.to)      params.set('to',      data.to)
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasFilters = !!(form.q || form.company || form.status || form.from || form.to)

  function reset() {
    const empty = { q: '', company: '', status: '', from: '', to: '' }
    setForm(empty)
    router.push(pathname)
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Recherche texte */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Recherche</Label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={form.q}
              onChange={e => setForm(f => ({ ...f, q: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && apply()}
              placeholder="Client ou produit…"
              className="h-9 w-48 pl-9"
            />
          </div>
        </div>

        {/* Client */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Client</Label>
          <Select
            value={form.company || '__all'}
            onValueChange={v => {
              const val = v === '__all' ? '' : v
              setForm(f => ({ ...f, company: val }))
              apply({ company: val })
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tous les clients</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statut */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Statut</Label>
          <Select
            value={form.status || '__all'}
            onValueChange={v => {
              const val = v === '__all' ? '' : v
              setForm(f => ({ ...f, status: val }))
              apply({ status: val })
            }}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Tous</SelectItem>
              <SelectItem value="delivered">Livrée</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Plage de dates */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Du</Label>
          <Input
            type="date"
            value={form.from}
            onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
            onBlur={() => apply()}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Au</Label>
          <Input
            type="date"
            value={form.to}
            onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
            onBlur={() => apply()}
            className="h-9 w-36"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-[1.375rem]">
          <Button onClick={() => apply()} size="sm" className="h-9">
            Filtrer
          </Button>
          {hasFilters && (
            <Button onClick={reset} variant="outline" size="sm" className="h-9 gap-1.5">
              <X size={13} />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
