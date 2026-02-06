'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, PlusCircle, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store'

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explorar' },
  { href: '/creator/content', icon: PlusCircle, label: 'Criar', highlight: true },
  { href: '/messages', icon: MessageCircle, label: 'Chat' },
  { href: '/settings', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors',
                isActive ? 'text-primary' : 'text-muted hover:text-foreground',
                item.highlight && !isActive && 'text-secondary',
              )}
            >
              {item.highlight ? (
                <div className="bg-gradient-to-r from-primary to-secondary p-2 rounded-full -mt-4 shadow-lg">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
              ) : (
                <item.icon className="w-5 h-5" />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
