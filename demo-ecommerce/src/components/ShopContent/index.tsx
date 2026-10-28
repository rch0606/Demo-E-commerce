'use client'
import { brand } from '@/brand.config'

import { useState, useEffect, useRef, useCallback } from 'react'
import { PackageSearch, Search, SlidersHorizontal } from 'lucide-react'
import type { Product, Category } from '@/payload-types'
import { ProductCard } from '@/components/ProductCard'
import {
  BREADCRUMB_HOME,
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
} from '@/utilities/generateStructuredData'
import { useRouter, usePathname } from 'next/navigation'
import {
  Breadcrumb,
  CONTAINER,
  EmptyState,
  FilterChip,
  FilterSection,
  Pill,
  PillPagination,
  PillRow,
  PRIMARY_BUTTON,
  PRODUCT_GRID,
  SECONDARY_BUTTON,
  SlideOver,
  SortSelect,
  catalogLabels,
  normalizeSort,
  type SortValue,
} from './ui'

interface ShopContentProps {
  products: Product[]
  categories: Category[]
  locale: string
  pagination: {
    currentPage: number
    totalPages: number
    totalDocs: number
  }
  initialFilters: {
    category: string  // This is the slug
    search: string
    maxPrice: number
    sort?: string
  }
  priceRange: {
    min: number
    max: number
  }
}

const INTRO: Record<string, string> = {
  fr: 'High-tech, maison, beauté, sport, mode et cuisine : une sélection pensée pour durer.',
  en: 'Tech, home, beauty, sport, fashion and kitchen: a selection made to last.',
  ar: 'تقنية، منزل، جمال، رياضة، أزياء ومطبخ: تشكيلة مختارة لتدوم.',
}

export function ShopContent({
  products,
  categories,
  locale,
  pagination,
  initialFilters,
  priceRange
}: ShopContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState(initialFilters.search)
  const [activeCatSlug, setActiveCatSlug] = useState(initialFilters.category)  // Store slug
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice)
  const [sort, setSort] = useState<SortValue>(normalizeSort(initialFilters.sort))
  const [showFilters, setShowFilters] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const labels = catalogLabels(locale)

  const formatPrice = (value: number) => {
    return `${value.toLocaleString('fr-FR')} DT`
  }

  const getCategoryTitle = (cat: Category) => {
    if (typeof cat.title === 'object') {
      return (cat.title as any)[locale] || (cat.title as any).en || ''
    }
    return cat.title || ''
  }

  const getCategorySlug = (cat: Category) => {
    return cat.slug || ''
  }

  const buildFilterParams = () => {
    const params = new URLSearchParams()

    if (activeCatSlug && activeCatSlug !== 'all') {
      params.set('category', activeCatSlug)  // Use slug
    }

    if (searchQuery && searchQuery.trim() !== '') {
      params.set('search', searchQuery.trim())
    }

    if (maxPrice < priceRange.max) {
      params.set('maxPrice', maxPrice.toString())
    }

    if (sort !== 'newest') {
      params.set('sort', sort)
    }

    return params
  }

  // Debounced filter updates. Skipped on mount so that opening a deep link
  // such as ?page=3 does not get reset to page 1.
  const isFirstRun = useRef(true)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    const timer = setTimeout(() => {
      updateFilters()
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, activeCatSlug, maxPrice, sort])

  const updateFilters = () => {
    const params = buildFilterParams()

    // Reset to page 1 when filters change
    params.set('page', '1')

    const queryString = params.toString()
    const url = queryString ? `${pathname}?${queryString}` : pathname

    setIsUpdating(true)
    router.push(url, { scroll: false })
    setTimeout(() => setIsUpdating(false), 300)
  }

  const handlePageChange = (page: number) => {
    const params = buildFilterParams()
    params.set('page', page.toString())

    router.push(`${pathname}?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCategoryClick = (slug: string) => {
    setActiveCatSlug(slug)  // Store slug
  }

  const resetFilters = () => {
    setActiveCatSlug('all')
    setSearchQuery('')
    setMaxPrice(priceRange.max)
  }

  const closeFilters = useCallback(() => setShowFilters(false), [])

  const activeCategory = categories.find((c) => getCategorySlug(c) === activeCatSlug)
  const hasSearch = searchQuery.trim() !== ''
  const hasPrice = maxPrice < priceRange.max
  const activeCount = (activeCategory ? 1 : 0) + (hasSearch ? 1 : 0) + (hasPrice ? 1 : 0)

  // Boutique pour Google : la liste des produits affichés et le fil d'Ariane.
  const schemaLocale = locale === 'ar' || locale === 'en' ? locale : 'fr'
  const shopName = { fr: 'Boutique', ar: 'المتجر', en: 'Shop' }[schemaLocale]
  const structuredData = [
    generateCollectionPageSchema({ name: `${shopName} | ${brand.name}`, url: `/${schemaLocale}/boutique` }, products, schemaLocale),
    generateBreadcrumbSchema([
      { name: BREADCRUMB_HOME[schemaLocale], url: `/${schemaLocale}` },
      { name: shopName, url: `/${schemaLocale}/boutique` },
    ]),
  ]

  return (
    <div className={`${CONTAINER} pb-20 pt-8 md:pt-12`}>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}

      {/* En-tête */}
      <header className="mb-8 md:mb-10">
        <Breadcrumb items={[{ label: labels.home, href: `/${schemaLocale}` }, { label: shopName }]} />
        <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          {activeCategory ? getCategoryTitle(activeCategory) : shopName}
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
          {INTRO[schemaLocale]}
        </p>
      </header>

      {/* Catégories */}
      <PillRow className="mb-8">
        <Pill active={activeCatSlug === 'all'} onClick={() => handleCategoryClick('all')}>
          {labels.all}
        </Pill>
        {categories && categories.map((c) => (
          <Pill
            key={c.id}
            active={activeCatSlug === getCategorySlug(c)}
            onClick={() => handleCategoryClick(getCategorySlug(c))}
          >
            {getCategoryTitle(c)}
          </Pill>
        ))}
      </PillRow>

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {labels.count(pagination.totalDocs)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 px-4 text-sm text-foreground transition-colors hover:border-foreground/40"
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            {labels.filters}
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] text-background">
                {activeCount}
              </span>
            )}
          </button>
          <SortSelect value={sort} onChange={setSort} labels={labels} />
        </div>
      </div>

      {/* Filtres actifs */}
      {activeCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeCategory && (
            <FilterChip onRemove={() => handleCategoryClick('all')} label={`${labels.clear} ${getCategoryTitle(activeCategory)}`}>
              {getCategoryTitle(activeCategory)}
            </FilterChip>
          )}
          {hasSearch && (
            <FilterChip onRemove={() => setSearchQuery('')} label={`${labels.clear} « ${searchQuery.trim()} »`}>
              « {searchQuery.trim()} »
            </FilterChip>
          )}
          {hasPrice && (
            <FilterChip onRemove={() => setMaxPrice(priceRange.max)} label={`${labels.clear} ${labels.price}`}>
              {labels.upTo} {formatPrice(maxPrice)}
            </FilterChip>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="ms-1 text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {labels.clearAll}
          </button>
        </div>
      )}

      {/* Grille */}
      <div className={`mt-8 transition-opacity duration-300 ${isUpdating ? 'opacity-60' : 'opacity-100'}`}>
        {products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-7 w-7" strokeWidth={1.5} />}
            title={labels.emptyTitle}
            text={labels.emptyText}
            action={
              <button type="button" onClick={resetFilters} className={SECONDARY_BUTTON}>
                {labels.reset}
              </button>
            }
          />
        ) : (
          <>
            <div className={PRODUCT_GRID}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <PillPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onChange={handlePageChange}
              labels={labels}
            />
          </>
        )}
      </div>

      {/* Panneau de filtres */}
      <SlideOver
        open={showFilters}
        onClose={closeFilters}
        title={labels.filters}
        closeLabel={labels.close}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={resetFilters} className={`${SECONDARY_BUTTON} flex-1 px-4`}>
              {labels.clear}
            </button>
            <button type="button" onClick={closeFilters} className={`${PRIMARY_BUTTON} flex-[2] px-4`}>
              {labels.show(pagination.totalDocs)}
            </button>
          </div>
        }
      >
        <FilterSection title={labels.search}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="h-12 w-full rounded-full border border-input bg-card pe-4 ps-11 text-sm outline-none focus:border-foreground/40 focus:ring-0"
            />
          </div>
        </FilterSection>

        <FilterSection title={labels.categories}>
          <div className="flex flex-wrap gap-2">
            <Pill active={activeCatSlug === 'all'} onClick={() => handleCategoryClick('all')}>
              {labels.all}
            </Pill>
            {categories.map((c) => (
              <Pill
                key={c.id}
                active={activeCatSlug === getCategorySlug(c)}
                onClick={() => handleCategoryClick(getCategorySlug(c))}
              >
                {getCategoryTitle(c)}
              </Pill>
            ))}
          </div>
        </FilterSection>

        <FilterSection title={labels.price}>
          <p className="mb-3 text-sm text-foreground">
            {labels.upTo} <span className="font-medium">{formatPrice(maxPrice)}</span>
          </p>
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            step={1}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            aria-label={labels.price}
            className="w-full cursor-pointer accent-foreground"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatPrice(priceRange.min)}</span>
            <span>{formatPrice(priceRange.max)}</span>
          </div>
        </FilterSection>
      </SlideOver>
    </div>
  )
}
