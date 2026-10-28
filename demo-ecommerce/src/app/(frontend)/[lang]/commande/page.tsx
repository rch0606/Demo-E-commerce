import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { OrderPageContent } from '@/components/OrderContent'
import { getDeliveryFee } from '@/utilities/deliveryFee'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ productId?: string; variantId?: string; qty?: string }>
}

async function getCartItemsFromCookies() {
  try {
    const cookieStore = await cookies()
    const cartData = cookieStore.get('cart-storage')

    if (!cartData) {
      return { items: [] }
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(cartData.value))
      const items = parsed?.state?.items ?? []
      return { items }
    } catch (parseError) {
      console.error('Error parsing cart cookie:', parseError)
      return { items: [] }
    }
  } catch (error) {
    console.error('Error getting cart items from cookies:', error)
    return { items: [] }
  }
}

async function fetchProductsByIds(productIds: string[], locale: string) {
  // Identifiants venus du cookie panier : seuls les ObjectId Mongo sont valides.
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
      limit: 20,
      where: {
        id: { in: validIds },
      },
    })

    const docs = productsResult.docs || []
    if (docs.length === 0) return []

    // Single variants query (avoid N+1)
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

      // Prefer last variant with stock > 0, otherwise last variant
      const initialVariant =
        [...variantDocs].reverse().find((variant: any) => {
          const stock = Number(variant?.stock)
          return Number.isFinite(stock) && stock > 0
        }) ||
        variantDocs[variantDocs.length - 1] ||
        null

      return {
        ...product,
        variants: {
          docs: variantDocs,
        },
        initialVariant,
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return []
  }
}

export default async function OrderPage({ params, searchParams }: PageProps) {
  try {
    const resolvedParams = await params
    const resolvedSearch = await searchParams
    const { lang } = resolvedParams
    const locale = isValidLocale(lang) ? lang : 'fr'

    const { items } = await getCartItemsFromCookies()
    const productIds = items
      .map((item: any) => String(item.productId || ''))
      .filter(Boolean)

    // Express checkout ("Acheter maintenant"): productId in URL so we can load it
    // even when the panier cookie is empty
    const expressProductId = resolvedSearch?.productId
      ? String(resolvedSearch.productId)
      : null
    const expressVariantId = resolvedSearch?.variantId
      ? String(resolvedSearch.variantId)
      : null
    const expressQty = resolvedSearch?.qty
      ? Math.max(1, parseInt(String(resolvedSearch.qty), 10) || 1)
      : 1

    if (expressProductId && !productIds.includes(expressProductId)) {
      productIds.push(expressProductId)
    }

    const products = await fetchProductsByIds(productIds, locale)
    const deliveryFee = await getDeliveryFee()

    return (
      <OrderPageContent
        products={products}
        initialItems={items}
        locale={locale}
        expressProductId={expressProductId}
        expressVariantId={expressVariantId}
        expressQty={expressQty}
        deliveryFee={deliveryFee}
      />
    )
  } catch (error) {
    console.error('Error rendering order page:', error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erreur</h1>
          <p className="text-muted-foreground">
            Impossible de charger la page de commande
          </p>
        </div>
      </div>
    )
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params
    const { lang } = resolvedParams
    const locale = isValidLocale(lang) ? lang : 'fr'

    return {
      title:
        locale === 'fr'
          ? 'Finaliser votre commande'
          : locale === 'ar'
            ? 'أكمل طلبك'
            : 'Complete your order',
      description:
        locale === 'fr'
          ? 'Finalisez votre commande en remplissant vos coordonnées'
          : locale === 'ar'
            ? 'أكمل طلبك عن طريق ملء معلوماتك'
            : 'Complete your order by filling in your details',
    }
  } catch (error) {
    return {
      title: 'Commande',
      description: 'Finaliser votre commande',
    }
  }
}

function isValidLocale(lang?: string): lang is Locale {
  return lang ? SUPPORTED_LOCALES.includes(lang as Locale) : false
}
