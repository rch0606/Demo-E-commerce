'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ShoppingBag, Heart } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import type { Product, Tag } from '@/payload-types'
import { ProductImageCarousel } from '../ProductImageCarousel'
import { CMSLink } from '../Link'
import { ProductQuickAddDialog } from '../ProductQuickAddDialog'
import { StarRating } from '../StarRating'
import { useWishlistStore } from '@/stores/wishlist'
import { getProductPromoPercentage, getPromoPricing } from '@/lib/categoryPromo'
import {
  trackAddToWishlist,
  trackRemoveFromWishlist,
} from '@/lib/analytics'

export function formatPrice(
  value: number | null | undefined,
  currency: string = 'DT',
) {
  if (value === null || value === undefined || isNaN(value)) {
    return `0 ${currency}`
  }
  return `${value.toLocaleString('fr-FR')} ${currency}`
}

const QUICK_ADD = { fr: 'Ajout rapide', en: 'Quick add', ar: 'إضافة سريعة' }

interface ProductCardProps {
  product?: Product
  showBadge?: boolean
  allTags?: Tag[]
}

export function ProductCard({
  product,
  showBadge = false,
  allTags = [],
}: ProductCardProps) {
  const { t, locale } = useLocale()
  const [quickOpen, setQuickOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { toggleItem, isInWishlist } = useWishlistStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getLocalized = (field: any): string => {
    if (!field) return ''
    if (typeof field === 'string') return field
    if (typeof field === 'object' && field !== null) {
      return field[locale] || field.en || Object.values(field)[0] || ''
    }
    return ''
  }

  const getImageUrl = (image: any): string => {
    if (!image) return '/placeholder.svg'
    if (typeof image === 'string') return image
    return image.url || image.sizes?.thumbnail?.url || '/placeholder.svg'
  }

  const images = useMemo(() => {
    const imageUrls: string[] = []

    if (product?.featuredImage) {
      const url = getImageUrl(product.featuredImage)
      if (url) imageUrls.push(url)
    }

    if (product?.gallery && Array.isArray(product.gallery)) {
      product.gallery.forEach((item: any) => {
        if (item?.image) {
          const url = getImageUrl(item.image)
          if (url) imageUrls.push(url)
        }
      })
    }

    if (imageUrls.length === 0) {
      imageUrls.push('/placeholder.svg')
    }

    // La photo principale figure souvent aussi dans la galerie.
    return Array.from(new Set(imageUrls))
  }, [product])

  const productBadges = useMemo(() => {
    if (!showBadge || !product?.badge) return []

    const badges: { name: string; color: string }[] = []
    const badgeTags = Array.isArray(product?.badge)
      ? product.badge
      : [product.badge]

    badgeTags.forEach((tag: any) => {
      if (!tag) return

      let name = ''
      let color = 'bg-brand-pink'

      if (typeof tag === 'string') {
        const foundTag = allTags.find((tg) => tg.id === tag)
        if (foundTag) {
          name = getLocalized(foundTag.name) || foundTag.id || ''
          color = foundTag.color || 'bg-brand-pink'
        } else {
          name = tag
        }
      }

      if (typeof tag === 'object' && tag !== null) {
        name = getLocalized(tag.name) || tag.id || ''
        color = tag.color || 'bg-brand-pink'
      }

      if (name) {
        badges.push({ name, color })
      }
    })

    return badges
  }, [product, showBadge, allTags, locale])

  const productTitle = getLocalized(product?.productTitle).trim()
  const productSubtitle = getLocalized(product?.subtitle).trim()
  const productSlug = getLocalized(product?.slug) || product?.id
  const averageRating = Number(product?.averageRating) || 0
  const reviewCount = Number(product?.reviewCount) || 0
  // Une promotion de catégorie remplace la promotion propre du produit :
  // le prix barré devient alors le prix de base.
  const promoPercentage = getProductPromoPercentage(product)
  const { price: currentPrice, oldPrice: promoOldPrice } = getPromoPricing(
    product?.currentPrice ?? 0,
    product?.oldPrice,
    promoPercentage,
  )
  const oldPrice = promoOldPrice ?? 0

  const discount =
    oldPrice > 0 && currentPrice > 0 && oldPrice > currentPrice
      ? Math.round((1 - currentPrice / oldPrice) * 100)
      : 0

  const openQuickAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!product?.id) return
      setQuickOpen(true)
    },
    [product?.id],
  )

  const inWishlist = mounted && product?.id ? isInWishlist(product.id) : false

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!product?.id) return
    const wasInWishlist = inWishlist
    const productId = String(product.id)
    toggleItem({
      productId: product.id,
      slug: String(productSlug || ''),
      title: productTitle,
      image: images[0],
      currentPrice,
      oldPrice: oldPrice > 0 ? oldPrice : undefined,
    })
    // Track favoris as visit events (same pipeline as add_to_cart)
    if (wasInWishlist) {
      trackRemoveFromWishlist({ productId, name: productTitle })
    } else {
      trackAddToWishlist({
        productId,
        value: Number(currentPrice) || 0,
        name: productTitle,
        source: 'product_card',
      })
    }
  }

  const soldOut = (Number(product?.totalStock) || 0) <= 0

  return (
    <>
      <div className="group flex flex-col">
        <div className="relative overflow-hidden rounded-2xl bg-brand-mist">
          <CMSLink url={`/produit/${productSlug}`} className="relative block aspect-[4/5] overflow-hidden">
            <ProductImageCarousel
              images={images}
              alt={productTitle}
              imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          </CMSLink>

          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1.5">
              {discount > 0 && (
                <span className="rounded-full bg-brand-blush px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {`-${discount}%`}
                </span>
              )}
              {/* Épuisé quand il ne reste rien, tous variants confondus (totalStock
                  est recalculé en base à chaque écriture). */}
              {soldOut && (
                <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-[11px] font-medium text-background">
                  Épuisé
                </span>
              )}
              {showBadge &&
                productBadges.slice(0, 2).map((badge, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: badge.color }} />
                    {badge?.name}
                  </span>
                ))}
            </div>

            {product?.id && (
              <button
                type="button"
                aria-label={inWishlist ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                onClick={toggleWishlist}
                className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur transition-colors hover:bg-card"
              >
                <Heart
                  strokeWidth={1.5}
                  className={`h-4 w-4 transition-colors ${inWishlist ? 'fill-brand-pink text-brand-pink' : ''}`}
                />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openQuickAdd}
            aria-label="Ajouter au panier"
            className="absolute inset-x-3 bottom-3 z-10 hidden items-center justify-center gap-2 rounded-full bg-card/95 py-2.5 text-sm font-medium text-foreground opacity-0 shadow-[0_8px_30px_rgba(38,35,43,0.08)] backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground md:flex md:translate-y-2"
          >
            <ShoppingBag strokeWidth={1.5} className="h-4 w-4" />
            {t.order}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-1 pt-3.5">
          {productSubtitle && (
            <p className="line-clamp-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {productSubtitle}
            </p>
          )}
          <CMSLink url={`/produit/${productSlug}`}>
            <h3 className="line-clamp-2 text-pretty text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
              {productTitle}
            </h3>
          </CMSLink>

          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <StarRating value={averageRating} starClassName="h-3 w-3" />
              <span>({reviewCount})</span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="text-base font-semibold text-foreground">
                {formatPrice(currentPrice, t.currency)}
              </span>
              {oldPrice > 0 && oldPrice > currentPrice && (
                <span className="text-[13px] text-muted-foreground line-through">
                  {formatPrice(oldPrice, t.currency)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={openQuickAdd}
              aria-label="Ajouter au panier"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-mist text-foreground transition-colors hover:bg-primary hover:text-primary-foreground md:hidden"
            >
              <ShoppingBag strokeWidth={1.5} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ProductQuickAddDialog
        productId={product?.id}
        initialProduct={product}
        preview={{
          title: productTitle,
          image: images[0],
          slug: String(productSlug || ''),
          currentPrice,
          oldPrice: oldPrice > 0 ? oldPrice : undefined,
        }}
        open={quickOpen}
        onOpenChange={setQuickOpen}
        locale={locale}
      />
    </>
  )
}
