// app/[lang]/boutique/page.tsx
import type { Metadata } from 'next'
import { cache } from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import type { Product, Category, Page } from '@/payload-types'
import { ShopContent } from '@/components/ShopContent'
import { generateMeta } from '@/utilities/generateMeta'
import { IN_STOCK_WHERE } from '@/lib/productVisibility'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

export const dynamic = 'force-dynamic'

/** Valeurs du paramètre `?sort=` vers le tri Payload. */
const SORTS: Record<string, string> = {
  newest: '-createdAt',
  'price-asc': 'currentPrice',
  'price-desc': '-currentPrice',
}

interface PageProps {
  params: Promise<{ lang?: string }>
  searchParams: Promise<{ 
    page?: string
    category?: string  // Now this will be the slug
    search?: string
    maxPrice?: string
    sort?: string
  }>
}

const queryProducts = cache(async (
  locale: Locale, 
  page: number = 1, 
  limit: number = 12,
  categorySlug?: string,  // Changed from categoryId
  search?: string,
  maxPrice?: number,
  sort: string = '-createdAt',
): Promise<{ docs: Product[], totalDocs: number, totalPages: number, page: number }> => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  // Build the where clause — les produits épuisés ne sont pas listés.
  const where: any = { ...IN_STOCK_WHERE }

  // Category filter - get category by slug first
  if (categorySlug && categorySlug !== 'all') {
    // First, find the category by slug
    const categoryResult = await payload.find({
      collection: 'categories',
      locale,
      where: {
        slug: {
          equals: categorySlug
        }
      },
      limit: 1,
    })

    const category = categoryResult.docs[0]
    if (category) {
      where.categories = {
        contains: category.id
      }
    }
  }

  // Search filter
  if (search && search.trim() !== '') {
    where.productTitle = {
      like: search.trim()
    }
  }

  // Price filter
  if (maxPrice && maxPrice > 0) {
    where.currentPrice = {
      less_than_equal: maxPrice
    }
  }

  const result = await payload.find({
    collection: 'products',
    locale,
    draft,
    limit,
    page,
    overrideAccess: draft,
    depth: 1,
    sort,
    where: Object.keys(where).length > 0 ? where : undefined,
  })

  return {
    docs: result.docs as Product[],
    totalDocs: result.totalDocs || 0,
    totalPages: result.totalPages || 0,
    page: result.page || 1,
  }
})


const queryShopPage = cache(async (locale: Locale): Promise<Page | null> => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    locale,
    draft,
    limit: 1,
    overrideAccess: draft,
    where: {
      slug: {
        equals: 'boutique'
      }
    },
  })

  return result.docs[0] as Page || null
})

const queryCategories = cache(async (locale: Locale): Promise<Category[]> => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'categories',
    locale,
    draft,
    limit: 100,
    pagination: false,
    overrideAccess: draft,
    sort: 'title',
  })

  return result.docs as Category[]
})

const getPriceRange = cache(async (locale: Locale): Promise<{ min: number, max: number }> => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'products',
    locale,
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: IN_STOCK_WHERE,
    sort: 'currentPrice',
  })

  const minResult = await payload.find({
    collection: 'products',
    locale,
    draft,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where: IN_STOCK_WHERE,
    sort: '-currentPrice',
  })

  const min = result.docs.length > 0 ? result.docs[0].currentPrice || 0 : 0
  const max = minResult.docs.length > 0 ? minResult.docs[0].currentPrice || 100 : 100

  return { min, max }
})

export default async function ShopPage({ params, searchParams }: PageProps) {
  const { lang = 'fr' } = await params
  const resolvedSearchParams = await searchParams
  const { 
    page = '1', 
    category = 'all',  // Now this is the slug
    search = '',
    maxPrice,
    sort,
  } = resolvedSearchParams
  
  const locale = SUPPORTED_LOCALES.includes(lang as Locale) ? (lang as Locale) : 'en'
  const currentPage = parseInt(page, 10) || 1
  const maxPriceNum = maxPrice ? parseFloat(maxPrice) : undefined

  const [productsResult, categories, priceRange] = await Promise.all([
    queryProducts(locale, currentPage, 12, category, search, maxPriceNum, SORTS[sort ?? ''] ?? '-createdAt'),
    queryCategories(locale),
    getPriceRange(locale),
  ])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="flex-1">
        <ShopContent
          products={productsResult.docs} 
          categories={categories} 
          locale={locale}
          pagination={{
            currentPage: productsResult.page || 1,
            totalPages: productsResult.totalPages || 1,
            totalDocs: productsResult.totalDocs || 0,
          }}
          initialFilters={{
            category,  // Pass the slug
            search,
            maxPrice: maxPriceNum || priceRange.max,
            sort,
          }}
          priceRange={priceRange}
        />
      </main>
    </div>
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang = 'fr' } = await params
  const locale = SUPPORTED_LOCALES.includes(lang as Locale) ? (lang as Locale) : 'en'
  
  // Fetch the shop page from Payload
  const page = await queryShopPage(locale)

  // If no page found, return default metadata
  if (!page) {
    return {
      title: 'Boutique',
      description: 'Explore our collection of products',
    }
  }

  // Use the generateMeta utility to create metadata from the page
  return generateMeta({ doc: page })
}

