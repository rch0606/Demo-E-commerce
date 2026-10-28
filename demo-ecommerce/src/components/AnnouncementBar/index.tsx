'use client'

import Link from 'next/link'
import { ArrowRight, Truck } from 'lucide-react'

import { useLocale } from '@/lib/locale-context'
import { cn } from '@/lib/utils'

const MESSAGE = {
  fr: 'Livraison gratuite dès 200 DT d’achat',
  ar: 'توصيل مجاني ابتداءً من 200 دينار',
  en: 'Free delivery on orders over 200 DT',
} as const

const LABEL = {
  fr: 'Voir la boutique',
  ar: 'تصفح المتجر',
  en: 'Browse the shop',
} as const

/** Bandeau fin au-dessus du header : le message et une flèche discrète vers la boutique. */
export function AnnouncementBar() {
  const { locale, dir } = useLocale()
  const key = (locale in MESSAGE ? locale : 'fr') as keyof typeof MESSAGE

  return (
    <div className="h-9 bg-primary text-xs text-primary-foreground">
      <Link
        href={`/${locale}/boutique`}
        aria-label={`${MESSAGE[key]} — ${LABEL[key]}`}
        className="group mx-auto flex h-full max-w-7xl items-center justify-center gap-2 px-4 text-primary-foreground no-underline hover:text-primary-foreground sm:px-6 lg:px-8"
      >
        <Truck className="h-3.5 w-3.5 shrink-0 text-primary-foreground/80" strokeWidth={1.5} aria-hidden />
        <span className="truncate tracking-wide">{MESSAGE[key]}</span>
        <span className="hidden h-3 w-px bg-foreground/20 sm:block" aria-hidden />
        <span className="hidden items-center gap-1 text-primary-foreground/75 transition-colors group-hover:text-primary-foreground sm:inline-flex">
          {LABEL[key]}
          <ArrowRight
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5',
              dir === 'rtl' && 'rotate-180 group-hover:-translate-x-0.5',
            )}
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      </Link>
    </div>
  )
}
