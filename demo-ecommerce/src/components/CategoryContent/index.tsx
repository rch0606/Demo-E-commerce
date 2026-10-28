'use client'

import Link from 'next/link'
import { PackageSearch } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import { useRouter, usePathname } from 'next/navigation'
import type { Category, Product } from '@/payload-types'
import { ProductCard } from '../ProductCard'
import { isCollectionCategory, seasonMood } from '@/lib/seasonMood'
import { Media } from '@/components/Media'
import {
  BREADCRUMB_HOME,
  categoryURL,
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  localized,
} from '@/utilities/generateStructuredData'
import {
  Breadcrumb,
  CONTAINER,
  EmptyState,
  Pill,
  PillPagination,
  PillRow,
  PRODUCT_GRID,
  SECONDARY_BUTTON,
  SortSelect,
  catalogLabels,
  normalizeSort,
  type SortValue,
} from '../ShopContent/ui'

interface CategoryContentProps {
  category: Category
  products: Product[]
  pagination: {
    currentPage: number
    totalPages: number
    totalDocs: number
  }
  pageSize: number
  /** Toutes les catégories, pour la rangée de pastilles. */
  categories?: Category[]
  sort?: string
}

const COLLECTION_LABEL: Record<string, string> = { fr: 'Collection', en: 'Collection', ar: 'مجموعة' }

export function CategoryContent({
  category,
  products,
  pagination,
  categories = [],
  sort,
}: CategoryContentProps) {
  const { locale } = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const labels = catalogLabels(locale)
  const currentSort = normalizeSort(sort)

  const getText = (value: string | Record<string, string> | undefined | null): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    return value[locale] || value.en || Object.values(value)[0] || ''
  }

  const categoryName = getText(category.title)
  const categoryDescription = getText(category.description)
  const hasImage = Boolean(category.image && typeof category.image === 'object')
  const isCollection = isCollectionCategory(category)
  const MoodIcon = seasonMood(category).icon

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSortChange = (value: SortValue) => {
    const params = new URLSearchParams(window.location.search)
    if (value === 'newest') params.delete('sort')
    else params.set('sort', value)
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Page catégorie pour Google : la catégorie, ses produits et le fil d'Ariane.
  const schemaName = localized(category.title, locale)
  const structuredData = [
    generateCollectionPageSchema(
      { name: schemaName, description: localized(category.description, locale), url: categoryURL(category, locale) },
      products,
      locale,
    ),
    generateBreadcrumbSchema([
      { name: BREADCRUMB_HOME[locale], url: `/${locale}` },
      { name: schemaName, url: categoryURL(category, locale) },
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

      {/* En-tête : titre et description, photo de la catégorie sur tuile beige */}
      <header className="mb-8 md:mb-10">
        <Breadcrumb
          items={[
            { label: labels.home, href: `/${locale}` },
            { label: labels.shop, href: `/${locale}/boutique` },
            { label: categoryName },
          ]}
        />
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-12">
          <div>
            {isCollection && (
              <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <MoodIcon className="h-3.5 w-3.5 text-brand-pink" strokeWidth={1.5} aria-hidden />
                {COLLECTION_LABEL[locale] ?? COLLECTION_LABEL.fr}
              </p>
            )}
            <h1 className="text-balance font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
              {categoryName}
            </h1>
            {categoryDescription && (
              <p className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
                {categoryDescription}
              </p>
            )}
          </div>
          {hasImage && (
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-brand-mist">
              <Media
                resource={category.image}
                fill
                htmlElement={null}
                imgClassName="object-cover"
                alt={categoryName}
                size="(max-width: 768px) 100vw, 640px"
                priority
              />
            </div>
          )}
        </div>
      </header>

      {/* Catégories */}
      {categories.length > 0 && (
        <PillRow className="mb-8">
          <Pill href={`/${locale}/boutique`}>{labels.all}</Pill>
          {categories.map((c) => {
            const slug = localized(c.slug, locale)
            if (!slug) return null
            return (
              <Pill key={c.id} href={`/${locale}/categorie/${slug}`} active={c.id === category.id}>
                {getText(c.title as any)}
              </Pill>
            )
          })}
        </PillRow>
      )}

      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground">{labels.count(pagination.totalDocs)}</p>
        <SortSelect value={currentSort} onChange={handleSortChange} labels={labels} />
      </div>

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-7 w-7" strokeWidth={1.5} />}
            title={labels.emptyTitle}
            text={labels.emptyText}
            action={
              <Link href={`/${locale}/boutique`} className={SECONDARY_BUTTON}>
                {labels.backToShop}
              </Link>
            }
          />
        ) : (
          <>
            <div className={PRODUCT_GRID}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
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
    </div>
  )
}
