import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CategoryContent } from '@/components/CategoryContent'
import type { Metadata } from 'next'
import { cache } from 'react'
import { Category } from '@/payload-types'
import { draftMode } from 'next/headers'
import { generateMeta } from '@/utilities/generateMeta'
import { IN_STOCK_WHERE } from '@/lib/productVisibility'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

const PAGE_SIZE = 12

/** Valeurs du paramètre `?sort=` vers le tri Payload. */
const SORTS: Record<string, string> = {
  newest: '-createdAt',
  'price-asc': 'currentPrice',
  'price-desc': '-currentPrice',
}

/** ISR: category pages refresh at most every 60s — keeps dropdown navigation fast */
export const revalidate = 60

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config })

    const categories = await payload.find({
      collection: 'categories',
      limit: 1000,
      select: { slug: true },
    })

    if (!categories.docs?.length) return []

    const staticParams: { slug: string; lang: string }[] = []
    for (const category of categories.docs) {
      if (!category?.slug) continue
      const slug =
        typeof category.slug === 'string'
          ? category.slug
          : (category.slug as any)?.fr ||
            (category.slug as any)?.en ||
            Object.values(category.slug as object)[0]
      if (!slug || typeof slug !== 'string') continue
      for (const lang of SUPPORTED_LOCALES) {
        staticParams.push({ slug, lang })
      }
    }

    return staticParams
  } catch (error) {
    console.error('Error generating category static params:', error)
    return []
  }
}

interface CategoryPageProps {
  params: Promise<{
    slug: string
    lang?: Locale
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
  }>
}

const queryCategoryPage = cache(
  async (slug: string, locale: Locale): Promise<Category | null> => {
    const { isEnabled: draft } = await draftMode()
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'categories',
      locale,
      draft,
      limit: 1,
      overrideAccess: draft,
      depth: 1,
      where: {
        slug: {
          equals: slug,
        },
      },
    })

    return result.docs[0] || null
  },
)

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug, lang = 'fr' } = await params
  const resolvedSearchParams = await searchParams
  const { page = '1', sort } = resolvedSearchParams
  const currentPage = Math.max(1, parseInt(page, 10) || 1)

  const payload = await getPayload({ config })

  // Single category lookup (depth 1 for image)
  const categoryResult = await payload.find({
    collection: 'categories',
    where: {
      slug: {
        equals: slug,
      },
    },
    locale: lang as any,
    limit: 1,
    depth: 1,
  })

  const category = categoryResult.docs[0]
  if (!category) notFound()

  // hasMany relationship: use `in` — no 1000-product JS fallback
  const productsResult = await payload.find({
    collection: 'products',
    // Droits d'un visiteur, comme la boutique : produits publiés uniquement.
    overrideAccess: false,
    where: {
      ...IN_STOCK_WHERE,
      categories: {
        in: [category.id],
      },
    },
    sort: SORTS[sort ?? ''] ?? '-createdAt',
    locale: lang as any,
    limit: PAGE_SIZE,
    page: currentPage,
    depth: 1,
  })

  // Pastilles de navigation entre catégories (en-tête de la page).
  const allCategories = await payload.find({
    collection: 'categories',
    locale: lang as any,
    limit: 100,
    pagination: false,
    depth: 0,
    sort: 'title',
    select: { title: true, slug: true },
  })

  const productDocs = productsResult.docs
  const totalDocs = productsResult.totalDocs || 0
  const totalPages = productsResult.totalPages || 1

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        <CategoryContent
          category={category}
          products={productDocs}
          pagination={{
            currentPage,
            totalPages,
            totalDocs,
          }}
          pageSize={PAGE_SIZE}
          categories={allCategories.docs as Category[]}
          sort={sort}
        />
      </main>
    </div>
  )
}

interface PageProps {
  params: Promise<{
    slug: string
    lang?: Locale
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, lang = 'fr' } = await params
  const locale = SUPPORTED_LOCALES.includes(lang as Locale)
    ? (lang as Locale)
    : 'en'

  const page = await queryCategoryPage(slug, locale)

  if (!page) {
    return {
      title: 'Category',
      description: 'Explore our collection of products',
    }
  }

  return generateMeta({ doc: page })
}
