import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Product } from '@/payload-types'
import OrderSuccessClient from './page.client'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function isValidLocale(lang?: string): lang is Locale {
  return lang ? SUPPORTED_LOCALES.includes(lang as Locale) : false
}

async function fetchRelatedProducts(
  productIds: string[],
  locale: string,
): Promise<Product[]> {
  if (productIds.length === 0) return []

  try {
    const payload = await getPayload({ config: configPromise })

    const ordered = await payload.find({
      collection: 'products',
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 1,
      limit: productIds.length,
      where: {
        id: { in: productIds },
      },
    })

    const categoryIds = new Set<string>()
    for (const product of ordered.docs) {
      const cats = (product as any).categories
      if (!Array.isArray(cats)) continue
      for (const cat of cats) {
        const id = typeof cat === 'object' && cat !== null ? cat.id : cat
        if (id) categoryIds.add(String(id))
      }
    }

    if (categoryIds.size === 0) return []

    const related = await payload.find({
      collection: 'products',
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 2,
      limit: 4,
      where: {
        and: [
          { id: { not_in: productIds } },
          { categories: { in: Array.from(categoryIds) } },
        ],
      },
    })

    return (related.docs || []) as Product[]
  } catch (error) {
    console.error('Error fetching related products:', error)
    return []
  }
}

export default async function OrderSuccessPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const locale = isValidLocale(resolvedParams.lang) ? resolvedParams.lang : 'fr'

  const idsRaw = resolvedSearch.ids
  const idsParam = Array.isArray(idsRaw) ? idsRaw[0] : idsRaw
  const productIds = (idsParam || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const relatedProducts = await fetchRelatedProducts(productIds, locale)

  return <OrderSuccessClient relatedProducts={relatedProducts} locale={locale} />
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const locale = isValidLocale(resolvedParams.lang) ? resolvedParams.lang : 'fr'

  return {
    title:
      locale === 'fr'
        ? 'Commande confirmée'
        : locale === 'ar'
          ? 'تم تأكيد الطلب'
          : 'Order confirmed',
  }
}
