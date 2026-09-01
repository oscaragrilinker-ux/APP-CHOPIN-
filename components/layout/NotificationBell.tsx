'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { profile } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(profile.id)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleClick = (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) markRead(id)
    if (link) {
      setOpen(false)
      router.push(link)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-secondary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Notifications'
          }
        >
          <Bell size={19} className="text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold font-serif">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent/75 transition-colors"
            >
              <CheckCheck size={13} />
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Liste */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={24} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif.id, notif.link, notif.is_read)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors hover:bg-secondary/70',
                  !notif.is_read && 'bg-accent/[0.04]'
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Indicateur non lu */}
                  <span
                    className={cn(
                      'mt-[5px] shrink-0 h-2 w-2 rounded-full transition-opacity',
                      notif.is_read ? 'opacity-0' : 'bg-accent opacity-100'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
