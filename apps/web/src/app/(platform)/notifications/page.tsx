'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, Coins, Users, Heart, MessageCircle, UserPlus, ImagePlus, X } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { useRef, useState, useCallback } from 'react'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  isRead: boolean
  createdAt: string
  data?: Record<string, unknown>
}

const typeIcons: Record<string, typeof Bell> = {
  tip_received: Coins,
  new_subscriber: Users,
  new_like: Heart,
  new_comment: MessageCircle,
  new_message: MessageCircle,
  new_follow: UserPlus,
  new_post: ImagePlus,
}

function getNotificationHref(notif: Notification): string | null {
  const data = notif.data
  if (!data) return null
  const username = data.creatorUsername as string | undefined
  switch (notif.type) {
    case 'new_post':
    case 'new_follow':
    case 'new_subscriber':
    case 'tip_received':
      return username ? `/creator/${username}` : null
    case 'new_like':
    case 'new_comment':
      return data.postId ? `/post/${data.postId}` : null
    case 'new_message':
      return `/messages`
    default:
      return null
  }
}

function SwipeableNotification({
  notif,
  onDelete,
}: {
  notif: Notification
  onDelete: (id: string) => void
}) {
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    currentXRef.current = 0
    setSwiping(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return
    const diff = e.touches[0].clientX - startXRef.current
    // Only allow left swipe
    const clamped = Math.min(0, diff)
    currentXRef.current = clamped
    setOffsetX(clamped)
  }, [swiping])

  const handleTouchEnd = useCallback(() => {
    setSwiping(false)
    // If swiped more than 40% of width, delete
    if (currentXRef.current < -120) {
      setOffsetX(-1000) // animate off screen
      setTimeout(() => onDelete(notif.id), 200)
    } else {
      setOffsetX(0)
    }
  }, [notif.id, onDelete])

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background revealed on swipe */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-lg">
        <X className="w-5 h-5 text-white" />
      </div>
      {/* Swipeable card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <NotificationCard notif={notif} onDelete={onDelete} />
      </div>
    </div>
  )
}

function NotificationCard({
  notif,
  onDelete,
}: {
  notif: Notification
  onDelete: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const Icon = typeIcons[notif.type] || Bell
  const username = notif.data?.creatorUsername as string | undefined
  const href = getNotificationHref(notif)

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const cardContent = (
    <CardContent className="py-3">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary/20' : 'bg-surface-light'}`}>
          <Icon className={`w-4 h-4 ${!notif.isRead ? 'text-primary' : 'text-muted'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${!notif.isRead ? 'font-semibold' : ''}`}>{notif.title}</p>
          {username && (
            <Link
              href={`/creator/${username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-primary font-medium hover:underline"
            >
              @{username}
            </Link>
          )}
          {notif.body && <p className="text-xs text-muted mt-0.5">{notif.body}</p>}
          <p className="text-xs text-muted mt-1">{timeAgo(notif.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!notif.isRead && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); markReadMutation.mutate(notif.id) }}
              className="text-xs text-primary hover:underline"
            >
              Lido
            </button>
          )}
          {/* X button - visible on desktop, hidden on mobile (use swipe instead) */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(notif.id) }}
            className="hidden md:flex p-1 text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
            title="Excluir notificacao"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </CardContent>
  )

  return href ? (
    <Link href={href}>
      <Card className={`transition-colors hover:border-border/80 cursor-pointer ${!notif.isRead ? 'bg-surface-light' : ''}`}>
        {cardContent}
      </Card>
    </Link>
  ) : (
    <Card className={`transition-colors ${!notif.isRead ? 'bg-surface-light' : ''}`}>
      {cardContent}
    </Card>
  )
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<Notification[]>('/notifications')
      return res.data
    },
    refetchInterval: 10000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Notificacoes</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-primary text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            Marcar tudo como lido
          </Button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <SwipeableNotification key={notif.id} notif={notif} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhuma notificacao ainda</p>
        </div>
      )}
    </div>
  )
}
