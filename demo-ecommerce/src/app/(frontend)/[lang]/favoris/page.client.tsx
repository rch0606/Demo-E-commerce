'use client'

import { useWishlistStore } from '@/stores/wishlist'
import { Heart, ShoppingBag, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { formatPrice } from '@/components/ProductCard'
import { useLocale } from '@/lib/locale-context'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ProductQuickAddDialog } from '@/components/ProductQuickAddDialog'
import type { Product } from '@/payload-types'
import {
  Breadcrumb,
  EmptyState,
  PRIMARY_BUTTON,
  PRODUCT_GRID,
  catalogLabels,
} from '@/components/ShopContent/ui'

const TEXT = {
  fr: {
    title: 'Mes favoris',
    count: (n: number) => `${n} article${n > 1 ? 's' : ''}`,
    continue: 'Continuer mes achats',
    clear: 'Tout retirer',
    remove: 'Retirer des favoris',
    add: 'Ajouter au panier',
    emptyTitle: 'Aucun favori pour le moment',
    emptyText: 'Touchez le cœur sur un produit pour le retrouver ici plus tard.',
    discover: 'Découvrir la boutique',
  },
  en: {
    title: 'My favourites',
    count: (n: number) => `${n} item${n > 1 ? 's' : ''}`,
    continue: 'Continue shopping',
    clear: 'Remove all',
    remove: 'Remove from favourites',
    add: 'Add to cart',
    emptyTitle: 'No favourites yet',
    emptyText: 'Tap the heart on a product to find it here later.',
    discover: 'Discover the shop',
  },
  ar: {
    title: 'المفضلة',
    count: (n: number) => `${n} منتج`,
    continue: 'مواصلة التسوق',
    clear: 'إزالة الكل',
    remove: 'إزالة من المفضلة',
    add: 'أضف إلى السلة',
    emptyTitle: 'لا توجد منتجات مفضلة بعد',
    emptyText: 'اضغط على القلب في أي منتج لتجده هنا لاحقًا.',
    discover: 'اكتشف المتجر',
  },
}

type WishlistItem =ReturnType<typeof useWishlistStore.getState>['items'][number]

/** Fetch full product + variants (same shape ProductCard passes as initialProduct). */
async function fetchProductForQuickAdd(
  productId: string,
  locale: string,
): Promise<Product | null> {
  const localeParam = locale ? `&locale=${encodeURIComponent(locale)}` : ''
  try {
    const [productRes, variantsRes] = await Promise.all([
      fetch(`/api/products/${encodeURIComponent(productId)}?depth=3${localeParam}`),
      fetch(
        `/api/variants?where[product][equals]=${encodeURIComponent(productId)}&limit=100&depth=2${localeParam}`,
      ),
    ])

    if (!productRes.ok) {
      console.error('Favoris product fetch failed', productRes.status)
      return null
    }

    const productData = await productRes.json()
    const variantsData = variantsRes.ok ? await variantsRes.json() : null
    const variantsDocs = Array.isArray(variantsData?.docs)
      ? variantsData.docs
      : Array.isArray((productData as any)?.variants?.docs)
        ? (productData as any).variants.docs
        : []

    return {
      ...productData,
      variants: {
        docs: variantsDocs,
        hasNextPage: Boolean(variantsData?.hasNextPage),
      },
    } as Product
  } catch (err) {
    console.error('Favoris product fetch error:', err)
    return null
  }
}

export function WishlistPageClient() {
  const { items, removeItem, clearWishlist } = useWishlistStore()
  const { t, locale } = useLocale()
  const pathname = usePathname()
  const [quickOpen, setQuickOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  /** Cached full products keyed by productId (string) */
  const productCacheRef = useRef<Record<string, Product>>({})
  const [cacheVersion, setCacheVersion] = useState(0)

  const getLocale = () => {
    const segments = pathname?.split('/') || []
    const possibleLocale = segments[1]
    return ['en', 'fr', 'ar'].includes(possibleLocale) ? possibleLocale : 'fr'
  }

  const isRTL = locale === 'ar' || getLocale() === 'ar'
  const labels = catalogLabels(getLocale())
  const tx = TEXT[getLocale() as keyof typeof TEXT] ?? TEXT.fr

  /**
   * Prefetch in background so most clicks open instantly (like ProductCard).
   */
  useEffect(() => {
    if (items.length === 0) return

    let cancelled = false

    const prefetch = async () => {
      const missing = items.filter(
        (item) => !productCacheRef.current[String(item.productId)],
      )
      if (missing.length === 0) return

      const results = await Promise.all(
        missing.map(async (item) => {
          const id = String(item.productId)
          const product = await fetchProductForQuickAdd(id, locale)
          return { id, product }
        }),
      )

      if (cancelled) return

      let updated = false
      for (const { id, product } of results) {
        if (product) {
          productCacheRef.current[id] = product
          updated = true
        }
      }
      if (updated) setCacheVersion((v) => v + 1)
    }

    prefetch()

    return () => {
      cancelled = true
    }
  }, [items, locale])

  /**
   * Like ProductCard: only open the dialog once we have a full product
   * (productAttributes + variants.docs). Fetch on click if not cached yet.
   */
  const handleOpenQuickAdd = useCallback(
    async (item: WishlistItem) => {
      const id = String(item.productId)

      let product: Product | null = productCacheRef.current[id] ?? null

      if (!product) {
        product = await fetchProductForQuickAdd(id, locale)
        if (product) {
          productCacheRef.current[id] = product
          setCacheVersion((v) => v + 1)
        }
      }

      if (!product) {
        console.error('Could not load product for quick add', id)
        return
      }

      setSelectedItem(item)
      setSelectedProduct(product)
      setQuickOpen(true)
    },
    [locale],
  )

  const handleQuickAddOpenChange = (open: boolean) => {
    setQuickOpen(open)
    if (!open) {
      setSelectedItem(null)
      setSelectedProduct(null)
    }
  }

  // silence unused warning for cacheVersion (triggers re-render after prefetch)
  void cacheVersion

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 md:pt-12 lg:px-8">
        {/* En-tête */}
        <header className="mb-8 border-b border-border pb-6 md:mb-10">
          <Breadcrumb items={[{ label: labels.home, href: `/${getLocale()}` }, { label: tx.title }]} />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
                {tx.title}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">{tx.count(items.length)}</p>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${getLocale()}/boutique`}
                  className="hidden h-10 items-center gap-2 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
                  {tx.continue}
                </Link>
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 px-4 text-sm text-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  {tx.clear}
                </button>
              </div>
            )}
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-7 w-7" strokeWidth={1.5} />}
            title={tx.emptyTitle}
            text={tx.emptyText}
            action={
              <Link href={`/${getLocale()}/boutique`} className={PRIMARY_BUTTON}>
                <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                {tx.discover}
              </Link>
            }
          />
        ) : (
          <div className={PRODUCT_GRID}>
            {items.map((item) => {
              const discount =
                item.oldPrice && item.oldPrice > item.currentPrice
                  ? Math.round((1 - item.currentPrice / item.oldPrice) * 100)
                  : 0
              const href = `/${getLocale()}/produit/${item.slug}`

              return (
                <div key={item.productId} className="group flex flex-col">
                  {/* Image sur tuile beige */}
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-brand-mist">
                    <Link href={href} className="absolute inset-0" aria-label={item.title}>
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
                        </div>
                      )}
                    </Link>
                    {discount > 0 && (
                      <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-brand-blush px-2.5 py-1 text-[11px] font-medium text-foreground">
                        -{discount}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      aria-label={tx.remove}
                      title={tx.remove}
                      className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-brand-pink backdrop-blur transition-colors hover:bg-background"
                    >
                      <Heart className="h-4 w-4 fill-current" strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Infos */}
                  <div className="mt-4 flex flex-1 flex-col">
                    <Link href={href}>
                      <h3 className="line-clamp-2 text-[15px] leading-snug text-foreground underline-offset-4 group-hover:underline">
                        {item.title}
                      </h3>
                    </Link>

                    <div className="mt-1.5 flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">
                        {formatPrice(item.currentPrice, t.currency)}
                      </span>
                      {item.oldPrice && item.oldPrice > item.currentPrice && (
                        <span className="text-muted-foreground line-through">
                          {formatPrice(item.oldPrice, t.currency)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd(item)}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-foreground/15 text-[13px] text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                    >
                      <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                      {tx.add}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ProductQuickAddDialog
        key={
          selectedItem
            ? `favoris-${selectedItem.productId}`
            : 'favoris-empty'
        }
        productId={selectedItem?.productId}
        initialProduct={selectedProduct}
        preview={
          selectedItem
            ? {
                title: selectedItem.title,
                image: selectedItem.image,
                slug: selectedItem.slug,
                currentPrice: selectedItem.currentPrice,
                oldPrice: selectedItem.oldPrice,
              }
            : undefined
        }
        open={quickOpen}
        onOpenChange={handleQuickAddOpenChange}
        locale={locale}
      />
    </div>
  )
}
