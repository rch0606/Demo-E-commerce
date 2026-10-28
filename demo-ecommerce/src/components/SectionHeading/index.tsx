import React from 'react'

import Icon from '@/components/Icon'
import { cn } from '@/lib/utils'

type SectionHeadingProps = {
  badge?: string | null
  icon?: string | null
  title?: string | null
  subtitle?: string | null
  align?: 'start' | 'center'
  /** Lien ou bouton affiché en bout de ligne (alignement « start » seulement). */
  action?: React.ReactNode
  className?: string
}

/** En-tête commun des sections de l'accueil : sur-titre, titre serif, sous-titre. */
export function SectionHeading({ badge, icon, title, subtitle, align = 'start', action, className }: SectionHeadingProps) {
  if (!badge && !title && !subtitle) return null

  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:mb-10',
        align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {badge && (
          <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {icon && <Icon name={icon} strokeWidth={1.5} className="h-3.5 w-3.5 text-brand-pink" />}
            {badge}
          </p>
        )}
        {title && (
          <h2 className="text-balance font-heading text-3xl font-normal leading-tight tracking-tight text-foreground md:text-4xl">
            {title}
          </h2>
        )}
        {subtitle && <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {action && align === 'start' && <div className="shrink-0">{action}</div>}
    </div>
  )
}
