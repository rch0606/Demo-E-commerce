'use client'

import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Icon from '@/components/Icon'
import { Media } from '@/components/Media'
import { CMSLink } from '@/components/Link'
import type { Category, CategoryPromo, HomePromoType } from '@/payload-types'
import { useLocale } from '@/lib/locale-context'
import { isPromoActive } from '@/lib/categoryPromo'

/** Jeton remplacé par le pourcentage réel de la promotion rattachée. */
const PROMO_TOKEN = '{promo}'

function useCountdown(endDate?: string | null) {
  const [target] = useState(() => {
    if (endDate) {
      return new Date(endDate).getTime()
    }
    const d = new Date()
    d.setDate(d.getDate() + 3)
    d.setHours(23, 59, 59, 0)
    return d.getTime()
  })
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (now === null) {
    return { days: null, hours: null, minutes: null }
  }

  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return { days, hours, minutes }
}

function CountdownCard({ value, label }: { value: number | null; label: string }) {
  return (
    <div className="flex min-w-[4.25rem] flex-col items-center rounded-full px-3 py-1.5">
      <span className="font-heading text-xl tabular-nums text-foreground">
        {value === null ? '--' : String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  )
}





export const HomePromoComponent: React.FC<HomePromoType> = ({
  icon,
  badge,
  headlinePre,
  headlineHighlight,
  description,
  ctaText = 'Shop the Collection',
  categoryPromo,
  category,
  promoImage,
  endDate,
  trustBadges = [],
}) => {
  // La relation n'est exploitable que peuplée ; en profondeur 0 on ne reçoit
  // qu'un identifiant et la bannière se comporte comme avant.
  const promo: CategoryPromo | null =
    categoryPromo && typeof categoryPromo === 'object' ? categoryPromo : null

  const promoIsLive = promo ? isPromoActive(promo) : true
  const percentage = promo && promoIsLive ? Number(promo.percentage) || 0 : 0

  // Destination du bouton : le choix explicite de l'éditeur prime, sinon on
  // retombe sur la première catégorie de la promotion rattachée.
  const promoCategory: Category | null = (() => {
    const first = Array.isArray(promo?.categories) ? promo.categories[0] : null
    return first && typeof first === 'object' ? (first as Category) : null
  })()

  const ctaCategory: Category | string | null =
    (category as Category | string | null) || promoCategory

  const { days, hours, minutes } = useCountdown(endDate || promo?.endsAt)
  const {t} = useLocale()

  /** Remplace {promo} par le pourcentage, ou le retire faute de promotion. */
  const fillPromo = (text?: string | null): string => {
    const value = text ?? ''
    if (!value.includes(PROMO_TOKEN)) return value

    const replacement = percentage ? `${Math.round(percentage)}%` : ''
    return value.split(PROMO_TOKEN).join(replacement).replace(/\s{2,}/g, ' ').trim()
  }

  const ctaReference = ctaCategory
    ? ({ relationTo: 'categories', value: ctaCategory } as const)
    : null

  // Une promotion terminée ou suspendue ne doit plus être annoncée.
  if (promo && !promoIsLive) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
      <div className="grid overflow-hidden rounded-[2rem] bg-brand-blush md:grid-cols-2">
        <div className="relative aspect-square md:aspect-auto md:min-h-[460px]">
          <Media
            resource={promoImage}
            fill
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover"
            alt={headlineHighlight || 'Promo image'}
          />
        </div>

        <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
          {badge && (
            <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {icon && <Icon name={icon} strokeWidth={1.5} className="h-3.5 w-3.5 text-brand-pink" />}
              {fillPromo(badge)}
            </p>
          )}

          {headlinePre && (
            <h2 className="mt-4 text-balance font-heading text-3xl font-normal leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {fillPromo(headlinePre)}{' '}
              {headlineHighlight && <em className="font-heading italic text-primary">{fillPromo(headlineHighlight)}</em>}
            </h2>
          )}

          {description && (
            <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-foreground/70">{fillPromo(description)}</p>
          )}

          <div className="mt-7 inline-flex w-fit items-center gap-1 rounded-full bg-card/80 p-1.5 backdrop-blur">
            <CountdownCard value={days} label={t.daysLabel} />
            <CountdownCard value={hours} label={t.hoursLabel} />
            <CountdownCard value={minutes} label={t.minutesLabel} />
          </div>

          {ctaText && ctaReference && (
            <div className="mt-8">
              <CMSLink
                reference={ctaReference}
                appearance="inline"
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground no-underline transition-colors hover:bg-primary/90 hover:no-underline"
              >
                {fillPromo(ctaText)}
                <ArrowRight
                  strokeWidth={1.5}
                  className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                />
              </CMSLink>
            </div>
          )}

          {trustBadges && trustBadges.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-foreground/10 pt-6">
              {trustBadges.map((badge, i) => (
                <li key={badge.id || i} className="flex items-center gap-2 text-[13px] text-foreground/70">
                  {badge.icon && <Icon name={badge.icon} strokeWidth={1.5} className="h-4 w-4 text-brand-green" />}
                  {badge.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
