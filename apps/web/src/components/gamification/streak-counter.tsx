'use client'

import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakCounterProps {
  streak: number
  className?: string
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  const intensity = streak > 30 ? 'text-error' : streak > 7 ? 'text-warning' : 'text-muted'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Flame className={cn('w-5 h-5', intensity, streak > 0 && 'animate-pulse')} />
      <span className={cn('font-bold text-sm', intensity)}>{streak}</span>
      <span className="text-xs text-muted">dias</span>
    </div>
  )
}
