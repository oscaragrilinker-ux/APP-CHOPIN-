'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  q?: string
  sort?: string
}

export function ClientSearch({ q: initQ = '', sort: initSort = 'activity' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initQ)

  function pushUrl(newQ: string, newSort: string) {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newSort && newSort !== 'activity') params.set('sort', newSort)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') pushUrl(q, initSort ?? 'activity')
          }}
          onBlur={() => {
            if (q !== initQ) pushUrl(q, initSort ?? 'activity')
          }}
          placeholder="Rechercher un client…"
          className="pl-9 h-9"
        />
      </div>

      <Select
        value={initSort ?? 'activity'}
        onValueChange={v => pushUrl(q, v)}
      >
        <SelectTrigger className="h-9 w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="activity">Dernière activité</SelectItem>
          <SelectItem value="ca">CA TTC décroissant</SelectItem>
          <SelectItem value="orders">Nb commandes</SelectItem>
          <SelectItem value="name">Nom A–Z</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
