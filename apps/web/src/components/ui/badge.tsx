import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'bronze' | 'silver' | 'gold' | 'diamond'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-light text-foreground',
  primary: 'bg-primary/20 text-primary',
  secondary: 'bg-secondary/20 text-secondary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  error: 'bg-error/20 text-error',
  bronze: 'bg-bronze/20 text-bronze',
  silver: 'bg-silver/20 text-silver',
  gold: 'bg-gold/20 text-gold',
  diamond: 'bg-diamond/20 text-diamond',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
