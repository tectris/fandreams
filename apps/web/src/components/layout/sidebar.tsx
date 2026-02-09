'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Compass,
  MessageCircle,
  BarChart3,
  Settings,
  Plus,
  Shield,
  Crown,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

const fanLinks = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/explore', icon: Compass, label: 'Explorar' },
  { href: '/messages', icon: MessageCircle, label: 'Mensagens' },
  { href: '/settings', icon: Settings, label: 'Configuracoes' },
]

const creatorLinks = [
  { href: '/creator/dashboard', icon: BarChart3, label: 'Dashboard' },
  { href: '/creator/content', icon: Plus, label: 'Novo post' },
  { href: '/creator/subscription', icon: Crown, label: 'Planos' },
  { href: '/creator/affiliates', icon: Share2, label: 'Afiliados' },
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/explore', icon: Compass, label: 'Explorar' },
  { href: '/messages', icon: MessageCircle, label: 'Mensagens' },
  { href: '/settings', icon: Settings, label: 'Configuracoes' },
]

const adminLinks = [
  { href: '/admin', icon: Shield, label: 'Admin' },
  { href: '/creator/content', icon: Plus, label: 'Novo post' },
  { href: '/creator/subscription', icon: Crown, label: 'Planos' },
  { href: '/creator/affiliates', icon: Share2, label: 'Afiliados' },
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/explore', icon: Compass, label: 'Explorar' },
  { href: '/messages', icon: MessageCircle, label: 'Mensagens' },
  { href: '/settings', icon: Settings, label: 'Configuracoes' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) return null

  const links =
    user?.role === 'admin'
      ? adminLinks
      : user?.role === 'creator'
        ? creatorLinks
        : fanLinks

  return (
    <aside className="hidden md:flex flex-col w-16 hover:w-56 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] py-4 px-2 hover:px-3 border-r border-border group/sidebar transition-all duration-200 overflow-hidden">
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:text-foreground hover:bg-surface-light',
              )}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">
                {link.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
