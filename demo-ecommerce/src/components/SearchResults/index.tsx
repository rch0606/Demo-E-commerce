'use client'

import { useEffect, useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import type { Product, Category } from '@/payload-types'
import { ProductCard } from '@/components/ProductCard'
import { localized } from '@/utilities/generateStructuredData'
import {
  CONTAINER,
  EmptyState,
  Pill,
  PillRow,
  PRODUCT_GRID,
  SECONDARY_BUTTON,
  catalogLabels,
} from '@/components/ShopContent/ui'
import Link from 'next/link'

interface SearchResultsProps {
  query: string
  products: Product[]
  categories: Category[]
  totalProducts: number
  locale: string
}

type Lang = 'fr' | 'en' | 'ar'

const TEXT = {
  fr: {
    eyebrow: 'Recherche',
    placeholder: 'Rechercher un produit, une marque, une catégorie…',
    submit: 'Rechercher',
    resultsFor: 'Résultats pour',
    askTitle: 'Que cherchez-vous ?',
    askText: 'Saisissez au moins deux lettres pour trouver un produit.',
    found: (n: number) => `${n} produit${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''}`,
    categories: 'Catégories',
    products: 'Produits',
    noneTitle: 'Aucun résultat',
    noneText: (q: string) => `Rien ne correspond à « ${q} ». Vérifiez l'orthographe ou explorez nos catégories.`,
    suggestions: 'Suggestions',
  },
  en: {
    eyebrow: 'Search',
    placeholder: 'Search a product, a brand, a category…',
    submit: 'Search',
    resultsFor: 'Results for',
    askTitle: 'What are you looking for?',
    askText: 'Type at least two letters to find a product.',
    found: (n: number) => `${n} product${n > 1 ? 's' : ''} found`,
    categories: 'Categories',
    products: 'Products',
    noneTitle: 'No results',
    noneText: (q: string) => `Nothing matches “${q}”. Check the spelling or explore our categories.`,
    suggestions: 'Suggestions',
  },
  ar: {
    eyebrow: 'بحث',
    placeholder: 'ابحث عن منتج أو علامة أو فئة…',
    submit: 'بحث',
    resultsFor: 'نتائج البحث عن',
    askTitle: 'عمّ تبحث؟',
    askText: 'اكتب حرفين على الأقل للعثور على منتج.',
    found: (n: number) => `${n} منتج`,
    categories: 'الفئات',
    products: 'المنتجات',
    noneTitle: 'لا توجد نتائج',
    noneText: (q: string) => `لا شيء يطابق «${q}». تحقق من الإملاء أو تصفح فئاتنا.`,
    suggestions: 'اقتراحات',
  },
}

export function SearchResults({ query, products, categories, totalProducts, locale }: SearchResultsProps) {
  const lang = (locale in TEXT ? locale : 'fr') as Lang
  const tx = TEXT[lang]
  const labels = catalogLabels(lang)
  const noResults = products.length === 0 && categories.length === 0

  // Suggestions de catégories quand il n'y a rien à afficher.
  const [suggestions, setSuggestions] = useState<Category[]>([])
  useEffect(() => {
    if (!noResults) return
    let cancelled = false
    fetch(`/api/categories?limit=12&depth=0&sort=title&locale=${encodeURIComponent(lang)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.docs)) setSuggestions(data.docs as Category[])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [noResults, lang])

  const categoryPills = (list: Category[]) => (
    <PillRow>
      {list.map((category) => {
        const slug = localized(category.slug, lang)
        if (!slug) return null
        return (
          <Pill key={category.id} href={`/${lang}/categorie/${slug}`}>
            {localized(category.title, lang)}
          </Pill>
        )
      })}
    </PillRow>
  )

  return (
    <main className="flex-1 bg-background">
      {/* En-tête : grand champ de recherche */}
      <section className="border-b border-border">
        <div className={`${CONTAINER} pb-10 pt-8 md:pb-14 md:pt-12`}>
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{tx.eyebrow}</p>
          <form action={`/${lang}/search`} method="get" role="search" className="relative max-w-3xl">
            <Search
              className="pointer-events-none absolute start-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.5}
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={tx.placeholder}
              aria-label={tx.placeholder}
              className="h-14 w-full rounded-full border border-input bg-card pe-32 ps-14 text-base outline-none focus:border-foreground/40 focus:ring-0 md:h-16 md:text-lg"
            />
            <button
              type="submit"
              className="absolute end-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 md:h-12 md:px-6"
            >
              {tx.submit}
            </button>
          </form>
          {query && (
            <div className="mt-8">
              <h1 className="text-balance font-heading text-3xl font-normal tracking-tight text-foreground md:text-5xl">
                {tx.resultsFor} « {query} »
              </h1>
              {!noResults && <p className="mt-3 text-sm text-muted-foreground">{tx.found(totalProducts)}</p>}
            </div>
          )}
        </div>
      </section>

      <div className={`${CONTAINER} pb-20 pt-10`}>
        {!query ? (
          <EmptyState
            icon={<Search className="h-7 w-7" strokeWidth={1.5} />}
            title={tx.askTitle}
            text={tx.askText}
          />
        ) : noResults ? (
          <EmptyState
            icon={<SearchX className="h-7 w-7" strokeWidth={1.5} />}
            title={tx.noneTitle}
            text={tx.noneText(query)}
            action={
              <Link href={`/${lang}/boutique`} className={SECONDARY_BUTTON}>
                {labels.backToShop}
              </Link>
            }
          >
            {suggestions.length > 0 && (
              <div className="mt-12 w-full">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {tx.suggestions}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((category) => {
                    const slug = localized(category.slug, lang)
                    if (!slug) return null
                    return (
                      <Pill key={category.id} href={`/${lang}/categorie/${slug}`}>
                        {localized(category.title, lang)}
                      </Pill>
                    )
                  })}
                </div>
              </div>
            )}
          </EmptyState>
        ) : (
          <>
            {categories.length > 0 && (
              <section className="mb-12">
                <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {tx.categories}
                </h2>
                {categoryPills(categories)}
              </section>
            )}

            {products.length > 0 && (
              <section>
                <h2 className="mb-6 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {tx.products}
                </h2>
                <div className={PRODUCT_GRID}>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
