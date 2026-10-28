'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Briques communes aux pages catalogue (boutique, catégorie, recherche, favoris) :
 * en-tête de page, rangée de pastilles, tri, panneau de filtres, pagination, état vide.
 */

type Lang = 'fr' | 'en' | 'ar'

const LABELS = {
  fr: {
    home: 'Accueil',
    shop: 'Boutique',
    all: 'Tout',
    filters: 'Filtres',
    sortBy: 'Trier par',
    newest: 'Nouveautés',
    priceAsc: 'Prix croissant',
    priceDesc: 'Prix décroissant',
    clear: 'Effacer',
    clearAll: 'Tout effacer',
    show: (n: number) => `Voir ${n} produit${n > 1 ? 's' : ''}`,
    count: (n: number) => `${n} produit${n > 1 ? 's' : ''}`,
    previous: 'Page précédente',
    next: 'Page suivante',
    page: 'Page',
    close: 'Fermer',
    categories: 'Catégories',
    price: 'Prix',
    upTo: "Jusqu'à",
    search: 'Recherche',
    searchPlaceholder: 'Rechercher un produit…',
    emptyTitle: 'Aucun produit ne correspond',
    emptyText: 'Essayez un autre filtre ou parcourez une autre catégorie.',
    reset: 'Réinitialiser les filtres',
    backToShop: 'Voir toute la boutique',
  },
  en: {
    home: 'Home',
    shop: 'Shop',
    all: 'All',
    filters: 'Filters',
    sortBy: 'Sort by',
    newest: 'Newest',
    priceAsc: 'Price: low to high',
    priceDesc: 'Price: high to low',
    clear: 'Clear',
    clearAll: 'Clear all',
    show: (n: number) => `Show ${n} product${n > 1 ? 's' : ''}`,
    count: (n: number) => `${n} product${n > 1 ? 's' : ''}`,
    previous: 'Previous page',
    next: 'Next page',
    page: 'Page',
    close: 'Close',
    categories: 'Categories',
    price: 'Price',
    upTo: 'Up to',
    search: 'Search',
    searchPlaceholder: 'Search a product…',
    emptyTitle: 'No products match',
    emptyText: 'Try another filter or browse another category.',
    reset: 'Reset filters',
    backToShop: 'Browse the whole shop',
  },
  ar: {
    home: 'الرئيسية',
    shop: 'المتجر',
    all: 'الكل',
    filters: 'التصفية',
    sortBy: 'ترتيب حسب',
    newest: 'الأحدث',
    priceAsc: 'السعر: من الأقل',
    priceDesc: 'السعر: من الأعلى',
    clear: 'مسح',
    clearAll: 'مسح الكل',
    show: (n: number) => `عرض ${n} منتج`,
    count: (n: number) => `${n} منتج`,
    previous: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    page: 'الصفحة',
    close: 'إغلاق',
    categories: 'الفئات',
    price: 'السعر',
    upTo: 'حتى',
    search: 'بحث',
    searchPlaceholder: 'ابحث عن منتج…',
    emptyTitle: 'لا توجد منتجات مطابقة',
    emptyText: 'جرّب تصفية أخرى أو تصفح فئة أخرى.',
    reset: 'إعادة ضبط التصفية',
    backToShop: 'تصفح المتجر بالكامل',
  },
}

export type CatalogLabels = (typeof LABELS)['fr']

export function catalogLabels(locale: string): CatalogLabels {
  return LABELS[(locale in LABELS ? locale : 'fr') as Lang]
}

export const SORT_VALUES = ['newest', 'price-asc', 'price-desc'] as const
export type SortValue = (typeof SORT_VALUES)[number]

export function normalizeSort(value: string | undefined | null): SortValue {
  return SORT_VALUES.includes(value as SortValue) ? (value as SortValue) : 'newest'
}

export const CONTAINER = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'

/* ------------------------------------------------------------------ */

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60 rtl:rotate-180" strokeWidth={1.5} aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Rangée de pastilles qui défile horizontalement (déborde jusqu'au bord sur mobile). */
export function PillRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {children}
    </div>
  )
}

const pillClass = (active?: boolean) =>
  cn(
    'inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors',
    active
      ? 'border-foreground bg-foreground text-background'
      : 'border-foreground/15 bg-transparent text-foreground hover:border-foreground/40',
  )

export function Pill({
  active,
  href,
  onClick,
  children,
}: {
  active?: boolean
  href?: string
  onClick?: () => void
  children: ReactNode
}) {
  if (href) {
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} className={pillClass(active)}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={pillClass(active)}>
      {children}
    </button>
  )
}

/** Sélecteur de tri au format pastille. */
export function SortSelect({
  value,
  onChange,
  labels,
}: {
  value: SortValue
  onChange: (value: SortValue) => void
  labels: CatalogLabels
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{labels.sortBy}</span>
      <select
        value={value}
        onChange={(e) => onChange(normalizeSort(e.target.value))}
        className="h-10 cursor-pointer appearance-none rounded-full border border-foreground/15 bg-transparent pe-10 ps-4 text-sm text-foreground outline-none transition-colors hover:border-foreground/40 focus:border-foreground/40 focus:ring-0"
      >
        <option value="newest">{labels.newest}</option>
        <option value="price-asc">{labels.priceAsc}</option>
        <option value="price-desc">{labels.priceDesc}</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-4 h-4 w-4 text-muted-foreground"
        strokeWidth={1.5}
        aria-hidden
      />
    </label>
  )
}

/** Pastille de filtre actif, avec croix pour la retirer. */
export function FilterChip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted pe-2.5 ps-3.5 text-[13px] text-foreground transition-colors hover:bg-brand-haze"
    >
      {children}
      <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
    </button>
  )
}

/** Panneau latéral qui glisse depuis le côté « start » (gauche, droite en arabe). */
export function SlideOver({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  closeLabel: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div className={cn('fixed inset-0 z-50', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn('absolute inset-0 bg-foreground/30 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute inset-y-0 start-0 flex w-full max-w-sm flex-col bg-background transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <h2 className="font-heading text-xl font-normal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-me-2 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-border px-6 py-4">{footer}</div>}
      </aside>
    </div>
  )
}

/** Section repliable d'un panneau de filtres (trait fin entre les sections). */
export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-border py-5 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={1.5} />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  )
}

/** Pagination en pastilles (fenêtre de 5 pages autour de la page courante). */
export function PillPagination({
  currentPage,
  totalPages,
  onChange,
  labels,
}: {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
  labels: CatalogLabels
}) {
  if (totalPages <= 1) return null

  const count = Math.min(5, totalPages)
  const pages = Array.from({ length: count }, (_, i) => {
    if (totalPages <= 5 || currentPage <= 3) return i + 1
    if (currentPage >= totalPages - 2) return totalPages - 4 + i
    return currentPage - 2 + i
  })

  const arrow =
    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 transition-colors hover:border-foreground/40 disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={labels.previous}
        className={arrow}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          aria-label={`${labels.page} ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
          className={cn(
            'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm transition-colors',
            page === currentPage ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted',
          )}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={labels.next}
        className={arrow}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
      </button>
    </nav>
  )
}

/** État vide : icône dans une pastille beige, phrase, action. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  children,
}: {
  icon: ReactNode
  title: string
  text?: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center md:py-24">
      <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted text-brand-pink">
        {icon}
      </span>
      <h2 className="font-heading text-2xl font-normal text-foreground">{title}</h2>
      {text && <p className="mt-2 text-pretty text-[15px] text-muted-foreground">{text}</p>}
      {action && <div className="mt-8">{action}</div>}
      {children}
    </div>
  )
}

export const PRIMARY_BUTTON =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
export const SECONDARY_BUTTON =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-transparent px-7 text-sm font-medium text-foreground transition-colors hover:bg-muted'

export const PRODUCT_GRID = 'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4'
