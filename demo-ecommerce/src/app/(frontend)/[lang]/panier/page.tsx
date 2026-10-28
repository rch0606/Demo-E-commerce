import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { CartPageClient } from './page.client'
import { getDeliveryFee } from '@/utilities/deliveryFee'
import type { Product } from '@/payload-types'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ lang: string }>
}

function isValidLocale(lang: string): lang is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang)
}

async function getCartItemsFromCookies() {
  try {
    const cookieStore = await cookies()
    const cartData = cookieStore.get('cart-storage')

    if (!cartData) {
      return { items: [] as any[] }
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(cartData.value))
      const items = parsed?.state?.items ?? []
      return { items }
    } catch (parseError) {
      console.error('Error parsing cart cookie:', parseError)
      return { items: [] as any[] }
    }
  } catch (error) {
    console.error('Error getting cart items from cookies:', error)
    return { items: [] as any[] }
  }
}

/** Same as /commande — load products + variants for cart line items */
async function fetchProductsByIds(
  productIds: string[],
  locale: string,
): Promise<Product[]> {
  // Le cookie panier vient du navigateur : on ignore les identifiants qui ne
  // sont pas des ObjectId Mongo plutôt que de faire échouer la requête.
  const validIds = productIds.filter((id) => /^[a-f0-9]{24}$/i.test(id))

  if (validIds.length === 0) {
    return []
  }

  try {
    const payload = await getPayload({ config: configPromise })

    const productsResult = await payload.find({
      collection: 'products',
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 3,
      limit: 50,
      where: {
        id: { in: validIds },
      },
    })

    const docs = productsResult.docs || []
    if (docs.length === 0) return []

    const variantsResult = await payload.find({
      collection: 'variants',
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 2,
      limit: 1000,
      where: {
        product: {
          in: productIds,
        },
      },
    })

    const variantsByProduct = new Map<string, any[]>()
    for (const variant of variantsResult.docs || []) {
      const productId =
        typeof variant.product === 'object'
          ? (variant.product as any)?.id
          : variant.product
      if (productId == null) continue
      const key = String(productId)
      const current = variantsByProduct.get(key) || []
      current.push(variant)
      variantsByProduct.set(key, current)
    }

    return docs.map((product) => {
      const variantDocs = variantsByProduct.get(String(product.id)) || []
      return {
        ...product,
        variants: {
          docs: variantDocs,
        },
      } as Product
    })
  } catch (error) {
    console.error('[panier] Error fetching products:', error)
    return []
  }
}

export const metadata: Metadata = {
  title: 'Mon panier',
}

export default async function CartPage({ params }: PageProps) {
  const { lang } = await params
  const locale = isValidLocale(lang) ? lang : 'fr'

  const { items } = await getCartItemsFromCookies()
  const rawIds: string[] = (items as any[]).map((item) =>
  String(item?.productId ?? '').trim(),
)
const productIds: string[] = Array.from(
  new Set(rawIds.filter((id) => id.length > 0)),
)

  const products = await fetchProductsByIds(productIds, locale)

  const deliveryFee = await getDeliveryFee()

  return <CartPageClient products={products} locale={locale} deliveryFee={deliveryFee} />
}
