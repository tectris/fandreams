'use client'

import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoDrawerProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function InfoDrawer({ title, children, className }: InfoDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn('inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors', className)}
        title={`Regras: ${title}`}
      >
        <Info className="w-4 h-4" />
        <span>Regras</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-surface border border-border rounded-t-xl sm:rounded-xl mx-0 sm:mx-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                {title}
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-muted space-y-3">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
