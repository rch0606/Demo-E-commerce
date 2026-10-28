'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const STARS = [1, 2, 3, 4, 5]

/** Étoiles en lecture seule, remplies au dixième près (ex. 4,3 / 5). */
export function StarRating({
  value,
  className,
  starClassName = 'h-4 w-4',
  label,
}: {
  value: number
  className?: string
  starClassName?: string
  label?: string
}) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0))

  return (
    <span
      role="img"
      aria-label={label ?? `${rating.toLocaleString('fr-FR')} / 5`}
      className={cn('inline-flex items-center gap-0.5', className)}
    >
      {STARS.map((star) => {
        const fill = Math.max(0, Math.min(1, rating - (star - 1)))
        return (
          <span key={star} className="relative inline-flex">
            <Star className={cn(starClassName, 'text-foreground/20')} strokeWidth={1.5} aria-hidden />
            {fill > 0 && (
              // Le remplissage partiel se fait par la gauche, y compris en arabe :
              // une note se lit toujours de la même façon.
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(starClassName, 'fill-brand-gold text-brand-gold')} strokeWidth={1.5} aria-hidden />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

/** Sélecteur de note 1 à 5 pour le formulaire d'avis. */
export function StarRatingInput({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (value: number) => void
  label: string
}) {
  const [hovered, setHovered] = useState(0)
  const shown = hovered || value

  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1" dir="ltr">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} / 5`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          <Star
            className={cn('h-7 w-7', star <= shown ? 'fill-brand-gold text-brand-gold' : 'text-foreground/25')}
            strokeWidth={1.5}
            aria-hidden
          />
        </button>
      ))}
    </div>
  )
}
