'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Shield } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!hydrated) return
    if (!user || user.role !== 'admin') {
      router.push('/feed')
    }
  }, [user, hydrated, router])

  // Still hydrating auth state — show loading
  if (!hydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-surface-light rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-light rounded-md" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Not admin — render nothing while redirecting
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <Shield className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted">Acesso restrito</p>
      </div>
    )
  }

  return <>{children}</>
}
