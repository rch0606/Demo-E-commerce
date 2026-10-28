import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Product, Category } from '@/payload-types'
import { SearchResults } from '@/components/SearchResults'
import { IN_STOCK_WHERE } from '@/lib/productVisibility'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

export const dynamic = 'force-dynamic'
export const revalidate = 3600

interface PageProps {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ q?: string }>
}

async function searchProducts(query: string, locale: string) {
  if (!query || query.length < 2) {
    return { products: [], categories: [], totalProducts: 0 }
  }

  try {
    const payload = await getPayload({ config: configPromise })

    // Search products
    const products = await payload.find({
      collection: 'products',
      // Droits d'un visiteur, comme la boutique : produits publiés uniquement.
      overrideAccess: false,
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 3,
      limit: 20,
      pagination: true,
      where: {
        ...IN_STOCK_WHERE,
        or: [
          { productTitle: { like: query } },
          { subtitle: { like: query } },
          { description: { like: query } },
          { barcode: { like: query.replace(/\s+/g, '') } },
          { 'categories.title': { like: query } },
          { 'attributesValues.value': { like: query } }
        ]
      }
    })

    // Search categories
    const categories = await payload.find({
      collection: 'categories',
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 2,
      limit: 5,
      where: {
        or: [
          { title: { like: query } },
          { description: { like: query } }
        ]
      }
    })

    return {
      products: products.docs as Product[],
      categories: categories.docs as Category[],
      totalProducts: products.totalDocs || 0 // Fixed: added fallback to 0
    }
  } catch (error) {
    console.error('Search error:', error)
    return { products: [], categories: [], totalProducts: 0 }
  }
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  try {
    const resolvedParams = await params
    const resolvedSearchParams = await searchParams
    
    const { lang } = resolvedParams
    const query = resolvedSearchParams.q || ''
    const locale = isValidLocale(lang) ? lang : 'fr'

    const { products, categories, totalProducts } = await searchProducts(query, locale)

    return (
      <div className="flex min-h-dvh flex-col">
        <SearchResults 
          query={query}
          products={products}
          categories={categories}
          totalProducts={totalProducts}
          locale={locale}
        />
      </div>
    )
  } catch (error) {
    console.error('Error rendering search page:', error)
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <h1 className="mb-3 font-heading text-3xl font-normal">Erreur</h1>
            <p className="text-muted-foreground">Impossible d'effectuer la recherche</p>
          </div>
        </main>
      </div>
    )
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  try {
    const resolvedSearchParams = await searchParams
    const query = resolvedSearchParams.q || ''

    return {
      title: query ? `Recherche: ${query}` : 'Recherche',
      description: query ? `Résultats de recherche pour "${query}"` : 'Recherche de produits',
    }
  } catch (error) {
    return {
      title: 'Recherche',
      description: 'Recherche de produits',
    }
  }
}

function isValidLocale(lang?: string): lang is Locale {
  return lang ? SUPPORTED_LOCALES.includes(lang as Locale) : false
}