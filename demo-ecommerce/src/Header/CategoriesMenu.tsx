'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import type { Category } from '@/payload-types'
import { useLocale } from '@/lib/locale-context'
import { cn } from '@/utilities/ui'
import { seasonMood } from '@/lib/seasonMood'

const COPY = {
  fr: { ages: 'Univers', collections: 'Collections', shop: 'Voir toute la boutique', discover: 'Découvrir' },
  ar: { ages: 'العوالم', collections: 'المجموعات', shop: 'تصفح كل المتجر', discover: 'اكتشف' },
  en: { ages: 'Departments', collections: 'Collections', shop: 'Browse the whole shop', discover: 'Discover' },
} as const

/**
 * Ordre et rangement par défaut tant que l'admin n'a pas renseigné « Type » et
 * « Ordre » : les univers d'abord (High-tech, Maison & Déco, Beauté…), puis les
 * sélections thématiques (idées cadeaux, bien-être) côté collections.
 */
const DEFAULT_ORDER = [
  'high-tech',
  'maison-deco',
  'beaute',
  'sport',
  'mode',
  'cuisine',
  'idees-cadeaux',
  'bien-etre',
]
const DEFAULT_COLLECTIONS = new Set(['idees-cadeaux', 'bien-etre'])

const slugOf = (category: Category) => String(category.slug ?? '')

const isCollection = (category: Category) => {
  const kind = (category as Category & { kind?: string | null }).kind
  if (kind === 'collection') return true
  if (kind === 'age') return false
  // Type non renseigné : on se fie au slug.
  return DEFAULT_COLLECTIONS.has(slugOf(category))
}

const rank = (category: Category) => {
  const order = (category as Category & { order?: number | null }).order
  if (typeof order === 'number' && Number.isFinite(order)) return order
  const index = DEFAULT_ORDER.indexOf(slugOf(category))
  return index === -1 ? 1000 : 100 + index
}

export function splitCategories(categories: Category[]) {
  const sorted = [...categories].sort(
    (a, b) => rank(a) - rank(b) || String(a.title ?? '').localeCompare(String(b.title ?? '')),
  )
  return {
    ages: sorted.filter((category) => !isCollection(category)),
    collections: sorted.filter(isCollection),
  }
}

const title = (category: Category) => String(category.title ?? '').trim()
const hasImage = (category: Category) => Boolean(category.image && typeof category.image === 'object')

const eyebrow = 'text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'

function Thumb({ category, size = 'h-10 w-10' }: { category: Category; size?: string }) {
  const mood = seasonMood(category)
  const Icon = mood.icon
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-mist ring-1 ring-border',
        size,
      )}
    >
      {hasImage(category) ? (
        <Media
          resource={category.image}
          fill
          htmlElement={null}
          imgClassName="object-cover"
          alt=""
          size="40px"
        />
      ) : (
        <Icon className="h-4 w-4 text-brand-pink" strokeWidth={1.5} aria-hidden />
      )}
    </span>
  )
}

/** Panneau large ouvert sous la barre de navigation (desktop). */
export function CategoriesMegaMenu({
  categories,
  onNavigate,
}: {
  categories: Category[]
  onNavigate: () => void
}) {
  const { locale } = useLocale()
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.fr
  const { ages, collections } = splitCategories(categories)

  return (
    <div className="absolute inset-x-0 top-full z-50">
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <div
          className={cn(
            'grid gap-8 rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-[0_8px_30px_rgba(38,35,43,0.06)] lg:p-8',
            collections.length > 0 && 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
          )}
        >
          <div className="flex flex-col">
            <p className={cn(eyebrow, 'mb-4')}>{copy.ages}</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 lg:grid-cols-3">
              {ages.map((category) => (
                <li key={category.id}>
                  <CMSLink
                    reference={{ relationTo: 'categories', value: category }}
                    onClick={onNavigate}
                    className="group flex items-center gap-3 rounded-2xl px-2 py-2 text-sm text-foreground no-underline transition-colors hover:bg-muted"
                  >
                    <Thumb category={category} />
                    <span className="font-heading text-base font-normal leading-tight transition-colors group-hover:text-primary">
                      {title(category)}
                    </span>
                  </CMSLink>
                </li>
              ))}
            </ul>
            <Link
              href={`/${locale}/boutique`}
              onClick={onNavigate}
              className="group mt-6 inline-flex w-fit items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm text-foreground no-underline transition-colors hover:bg-muted"
            >
              {copy.shop}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                strokeWidth={1.5}
              />
            </Link>
          </div>

          {collections.length > 0 && (
            <div className="md:border-s md:border-border md:ps-8">
              <p className={cn(eyebrow, 'mb-4')}>{copy.collections}</p>
              <div className="grid grid-cols-2 gap-3">
                {collections.map((category) => (
                  <CollectionCard key={category.id} category={category} discover={copy.discover} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CollectionCard({
  category,
  discover,
  onNavigate,
  compact = false,
}: {
  category: Category
  discover: string
  onNavigate: () => void
  compact?: boolean
}) {
  const mood = seasonMood(category)
  const Icon = mood.icon
  const withImage = hasImage(category)

  return (
    <CMSLink
      reference={{ relationTo: 'categories', value: category }}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-end overflow-hidden rounded-2xl no-underline ring-1 ring-border',
        withImage ? 'bg-brand-haze' : 'bg-gradient-to-br from-brand-mist to-brand-haze',
        compact ? 'h-28' : 'h-48',
      )}
    >
      {withImage ? (
        <>
          <Media
            resource={category.image}
            fill
            htmlElement={null}
            imgClassName="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            alt={title(category)}
            size="(max-width: 768px) 50vw, 280px"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent" />
        </>
      ) : (
        <Icon
          className={cn(
            'absolute end-4 top-4 text-brand-pink/50 transition-transform duration-500 group-hover:rotate-6',
            compact ? 'h-8 w-8' : 'h-12 w-12',
          )}
          strokeWidth={1}
          aria-hidden
        />
      )}
      <span
        className={cn(
          'relative z-10 flex w-full flex-col gap-1 p-4',
          withImage ? 'text-white' : 'text-foreground',
        )}
      >
        <span className={cn('font-heading font-normal leading-tight', compact ? 'text-base' : 'text-xl')}>
          {title(category)}
        </span>
        {!compact && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              withImage ? 'text-white/85' : 'text-muted-foreground',
            )}
          >
            {discover}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              strokeWidth={1.5}
            />
          </span>
        )}
      </span>
    </CMSLink>
  )
}

/** Même rangement dans le menu mobile : tuiles des univers, puis cartes collections. */
export function CategoriesMobileMenu({
  categories,
  onNavigate,
}: {
  categories: Category[]
  onNavigate: () => void
}) {
  const { locale } = useLocale()
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.fr
  const { ages, collections } = splitCategories(categories)

  return (
    <div>
      <p className={cn(eyebrow, 'pb-3 pt-2')}>{copy.ages}</p>
      <ul className="grid grid-cols-2 gap-2">
        {ages.map((category) => (
          <li key={category.id}>
            <CMSLink
              reference={{ relationTo: 'categories', value: category }}
              onClick={onNavigate}
              className="flex h-full items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5 text-sm text-foreground no-underline transition-colors hover:bg-muted"
            >
              <Thumb category={category} size="h-9 w-9" />
              <span className="line-clamp-2 leading-tight">{title(category)}</span>
            </CMSLink>
          </li>
        ))}
      </ul>

      {collections.length > 0 && (
        <>
          <p className={cn(eyebrow, 'pb-3 pt-6')}>{copy.collections}</p>
          <div className="grid grid-cols-2 gap-2">
            {collections.map((category) => (
              <CollectionCard
                key={category.id}
                category={category}
                discover={copy.discover}
                onNavigate={onNavigate}
                compact
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
