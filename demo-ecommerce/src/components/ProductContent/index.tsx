'use client'

import {
  Banknote,
  Check,
  ChevronDown,
  Heart,
  Minus,
  Plus,
  RefreshCcw,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import type { Product } from '@/payload-types'
import { ProductGallery } from '@/components/ProductGallery'
import { useLocale } from '@/lib/locale-context'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ProductCard } from '../ProductCard'
import { ProductReviews, type ProductReviewsPage } from '@/components/ProductReviews'
import { StarRating } from '@/components/StarRating'
import { SectionHeading } from '@/components/SectionHeading'
import type { Category } from '@/payload-types'
import {
  BREADCRUMB_HOME,
  categoryURL,
  generateBreadcrumbSchema,
  generateProductSchema,
  localized,
  productURL,
} from '@/utilities/generateStructuredData'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useProductVariants } from '@/hooks/useProductVariants'
import { trackAddToCart, trackViewContent } from '@/lib/metaPixel'
import {
  trackViewProduct,
  trackAddToCart as trackAnalyticsAddToCart,
  trackBeginCheckout,
  trackAddToWishlist,
  trackRemoveFromWishlist,
} from '@/lib/analytics'

type Locale = 'fr' | 'en' | 'ar'

/** Textes propres à la fiche produit (absents des dictionnaires partagés). */
const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    addToCart: 'Ajouter au panier',
    added: 'Ajouté',
    buyNow: 'Acheter maintenant',
    soldOut: 'Épuisé',
    unavailable: 'Indisponible',
    inStock: 'En stock — expédié sous 24h',
    lowStock: 'Plus que {count} en stock',
    chooseOptions: 'Choisissez vos options',
    quantity: 'Quantité',
    decrease: 'Diminuer la quantité',
    increase: 'Augmenter la quantité',
    reassureDelivery: 'Livraison 24–48h partout en Tunisie',
    reassurePayment: 'Paiement à la livraison',
    reassureExchange: 'Échange gratuit sous 30 jours',
    details: 'Caractéristiques',
    shipping: 'Livraison & retours',
    shippingText:
      'Livraison à domicile en 24 à 48h ouvrées partout en Tunisie. Vous payez en espèces à la réception de votre colis, après l’avoir vérifié.\n\nUn article ne vous convient pas ? Vous disposez de 30 jours pour l’échanger : il doit être non porté, dans son emballage d’origine. Contactez-nous et nous organisons l’enlèvement.',
    breadcrumb: 'Fil d’Ariane',
    photo: 'Photo',
  },
  en: {
    addToCart: 'Add to cart',
    added: 'Added',
    buyNow: 'Buy it now',
    soldOut: 'Sold out',
    unavailable: 'Unavailable',
    inStock: 'In stock — ships within 24h',
    lowStock: 'Only {count} left in stock',
    chooseOptions: 'Choose your options',
    quantity: 'Quantity',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    reassureDelivery: '24–48h delivery across Tunisia',
    reassurePayment: 'Cash on delivery',
    reassureExchange: 'Free exchange within 30 days',
    details: 'Specifications',
    shipping: 'Shipping & returns',
    shippingText:
      'Home delivery within 24 to 48 business hours anywhere in Tunisia. Pay in cash when your parcel arrives, after checking it.\n\nNot quite right? You have 30 days to exchange an item: it must be unworn and in its original packaging. Contact us and we will arrange the pickup.',
    breadcrumb: 'Breadcrumb',
    photo: 'Photo',
  },
  ar: {
    addToCart: 'أضف إلى السلة',
    added: 'تمت الإضافة',
    buyNow: 'اشترِ الآن',
    soldOut: 'نفدت الكمية',
    unavailable: 'غير متوفر',
    inStock: 'متوفر — يُشحن خلال 24 ساعة',
    lowStock: 'بقي {count} فقط في المخزون',
    chooseOptions: 'اختر الخيارات',
    quantity: 'الكمية',
    decrease: 'إنقاص الكمية',
    increase: 'زيادة الكمية',
    reassureDelivery: 'توصيل خلال 24–48 ساعة في كامل تونس',
    reassurePayment: 'الدفع عند الاستلام',
    reassureExchange: 'استبدال مجاني خلال 30 يومًا',
    details: 'المواصفات',
    shipping: 'التوصيل والإرجاع',
    shippingText:
      'توصيل إلى المنزل خلال 24 إلى 48 ساعة عمل في كامل أنحاء تونس. تدفع نقدًا عند استلام الطرد بعد التحقق منه.\n\nالمنتج لا يناسبك؟ لديك 30 يومًا لاستبداله، بشرط ألا يكون مستعملًا وأن يكون في غلافه الأصلي. تواصل معنا وسننظم استلامه.',
    breadcrumb: 'مسار التنقل',
    photo: 'صورة',
  },
}

const LOW_STOCK_THRESHOLD = 5

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

const isColorName = (name?: string) => {
  const lower = (name || '').toLowerCase()
  return lower.includes('color') || lower.includes('couleur') || lower.includes('لون')
}

/** Libellé d'une valeur d'attribut peuplée (ou rien si non peuplée). */
const colorLabel = (value: any): string | null => {
  if (!value || typeof value !== 'object') return null
  return String(value.label || value.value || '').toLowerCase().trim() || null
}

/** Accordéon natif (details/summary) : accessible et sans JavaScript. */
function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
          strokeWidth={1.5}
        />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  )
}

export function ProductContent({
  product,
  related,
  reviews,
  seoExcludedImageIds,
  mode = 'page',
  onAdded,
}: {
  product: Product
  related?: Product[]
  reviews?: ProductReviewsPage
  /** Photos de la galerie à ne pas annoncer à Google (image principale d'un autre produit). */
  seoExcludedImageIds?: string[]
  mode?: 'page' | 'modal'
  onAdded?: () => void
}) {
  const router = useRouter()
  const { addItem, startExpressCheckout } = useCartStore()
  const { toggleItem, isInWishlist } = useWishlistStore()
  const { locale, t } = useLocale()
  const isRTL = locale === 'ar'
  const isModal = mode === 'modal'
  const copy = COPY[(locale as Locale) in COPY ? (locale as Locale) : 'fr']

  // Le bouton de contact flottant est ancré en bas de l'écran : il recouvre
  // « Ajouter au panier » dès que celui-ci arrive dans le viewport. On le fait
  // s'effacer tant que le bloc d'achat est visible (et toujours sur mobile,
  // où la barre d'achat fixe prend sa place).
  const purchaseRef = useRef<HTMLDivElement>(null)
  const [purchaseVisible, setPurchaseVisible] = useState(true)

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  // Le store favoris est persisté : on n'affiche son état qu'après le montage
  // pour éviter un mismatch d'hydratation.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const target = purchaseRef.current
    if (isModal || !target || typeof IntersectionObserver === 'undefined') return

    const setFloatingContactHidden = (hidden: boolean) => {
      window.dispatchEvent(new CustomEvent('floating-contact', { detail: { hidden } }))
    }
    const isMobile = () => window.matchMedia('(max-width: 1023px)').matches

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPurchaseVisible(entry.isIntersecting || entry.boundingClientRect.top > 0)
        setFloatingContactHidden(entry.isIntersecting || isMobile())
      },
      // Marge basse : le bouton flottant se retire un peu avant le contact.
      { rootMargin: '0px 0px 96px 0px' },
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
      // Quitter la fiche produit doit toujours rendre le bouton au reste du site.
      setFloatingContactHidden(false)
    }
  }, [isModal])

  // ViewContent once per product page (not when opened as modal)
  useEffect(() => {
    if (mode !== 'page' || !product?.id) return
    const productId = String(product.id)
    const value = Number((product as any).currentPrice) || 0
    const title =
      typeof product.productTitle === 'string'
        ? product.productTitle
        : (product.productTitle as any)?.[locale] ||
          (product.productTitle as any)?.fr ||
          (product.productTitle as any)?.en ||
          Object.values((product.productTitle as any) || {})[0] ||
          ''
    trackViewContent({
      contentIds: productId,
      value,
      currency: 'TND',
    })
    trackViewProduct({ productId, value, name: String(title || '') })
  }, [product?.id, mode, locale, product?.productTitle])

  // La galerie suit la couleur du variant choisi.
  const handleColorSelect = useCallback((color: string | null) => {
    setSelectedColor(color)
    setSelectedImageIndex(0)
  }, [])

  const {
    variants,
    attributes,
    selectedValues,
    selectedVariant,
    currentPrice,
    currentOldPrice,
    currentStock,
    promoPercentage,
    allAttributesSelected,
    selectValue,
    getValues,
    getAttributeId,
    getAttributeName,
    getValueId,
    getValueName,
    getSelectedAttributesForCart,
  } = useProductVariants({
    product,
    onColorSelect: handleColorSelect,
  })

  // Changer de taille ne doit pas garder une quantité supérieure au stock de
  // la nouvelle taille : la commande échouait ensuite sur « Stock insuffisant ».
  useEffect(() => {
    const stock = Number(currentStock) || 0
    if (stock > 0) setSelectedQuantity((quantity) => Math.min(quantity, stock))
  }, [currentStock])

  const getText = (value: string | Record<string, string> | undefined | null): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    return value[locale] || value.fr || value.en || Object.values(value)[0] || ''
  }

  const formatPrice = (price: number) => {
    const currency = t.currency || 'DT'
    return `${price.toLocaleString(locale === 'ar' ? 'ar-SA' : 'fr-FR')} ${currency}`
  }

  const getProductImage = (p: any) => {
    if (!p) return null
    if (p.featuredImage) {
      return typeof p.featuredImage === 'string' ? p.featuredImage : p.featuredImage.url
    }
    if (p.gallery?.length > 0) {
      const firstImage = p.gallery[0]?.image
      if (firstImage) {
        return typeof firstImage === 'string' ? firstImage : firstImage.url
      }
    }
    return null
  }

  const galleryImages = useMemo(() => {
    const map = new Map<string, { image: any; colors: string[] }>()

    const addImage = (image: any, color?: string | null) => {
      if (!image?.id) return
      const id = image.id
      if (!map.has(id)) map.set(id, { image, colors: [] })
      if (color) {
        const item = map.get(id)!
        const normalized = color.toLowerCase().trim()
        if (!item.colors.includes(normalized)) item.colors.push(normalized)
      }
    }

    if (product.featuredImage) addImage(product.featuredImage, colorLabel((product as any).featuredImageColor))
    product.gallery?.forEach((item: any) => addImage(item?.image, colorLabel(item?.color)))

    const variantDocs = (product as any).variants?.docs || []
    variantDocs.forEach((variant: any) => {
      let variantColor: string | null = null
      variant.combination?.forEach((item: any) => {
        const name = item.attribute?.label || item.attribute?.name || ''
        if (isColorName(name)) {
          variantColor = item.label || item.value || null
        }
      })
      variant.images?.forEach((item: any) => addImage(item.image, variantColor))
    })

    return Array.from(map.values())
  }, [product])

  // Couleur choisie : ses photos d'abord, puis les photos sans couleur ; les
  // photos des autres couleurs sont masquées.
  const displayImages = useMemo(() => {
    if (!selectedColor) return galleryImages
    const matching = galleryImages.filter((item) => item.colors.includes(selectedColor))
    if (!matching.length) return galleryImages
    const neutral = galleryImages.filter((item) => item.colors.length === 0)
    return [...matching, ...neutral]
  }, [galleryImages, selectedColor])

  const hasVariants = variants.length > 0
  const hasAttributes = attributes.length > 0

  const categoryDocs = useMemo(
    () =>
      (Array.isArray(product.categories) ? product.categories : []).filter(
        (item): item is Category => typeof item === 'object' && item !== null,
      ),
    [product.categories],
  )

  // Une combinaison choisie qui ne correspond à aucun variant n'est pas
  // « épuisée » : elle n'existe pas. Les deux bloquent l'achat, mais le client
  // mérite le mot juste.
  const isUnavailableCombination =
    allAttributesSelected && hasAttributes && !selectedVariant

  // Épuisé uniquement quand le variant sélectionné a stock = 0 (pas le totalStock produit)
  const isOutOfStock =
    allAttributesSelected &&
    !isUnavailableCombination &&
    (selectedVariant ? (Number(selectedVariant.stock) || 0) <= 0 : currentStock <= 0)

  const canPurchase = allAttributesSelected && !isOutOfStock && !isUnavailableCombination
  const unavailableLabel = isUnavailableCombination ? copy.unavailable : copy.soldOut

  /**
   * Une valeur est disponible s'il existe un variant en stock qui la contient,
   * compte tenu des choix faits sur les attributs précédents (logique Dawn).
   */
  const isValueAvailable = (attributeIndex: number, valueId: string) => {
    if (!hasVariants) return true
    const required = [valueId]
    attributes.slice(0, attributeIndex).forEach((attribute: any) => {
      const selected = selectedValues[String(getAttributeId(attribute))]
      if (selected) required.push(String(selected))
    })
    return variants.some((variant: any) => {
      const ids = (variant.combination || []).map((item: any) =>
        String(typeof item === 'object' && item !== null ? item.id : item),
      )
      return required.every((id) => ids.includes(id)) && (Number(variant.stock) || 0) > 0
    })
  }

  const handleAddToCart = () => {
    if (!canPurchase) return

    setIsAddingToCart(true)

    const imageUrl = getProductImage(product)
    const selectedAttributes = getSelectedAttributesForCart()
    const variantId = selectedVariant?.id || null

    const productId = String(product.id)
    const price = Number(currentPrice) || 0

    try {
      addItem(
        {
          productId,
          variantId: variantId ? String(variantId) : null,
          slug: String(getText(product.slug as any) || product.slug || ''),
          title: String(getText(product.productTitle) || product.productTitle || ''),
          image: imageUrl || undefined,
          quantity: selectedQuantity,
          price,
          oldPrice: currentOldPrice != null ? Number(currentOldPrice) : undefined,
          stock: currentStock,
          selectedAttributes: selectedAttributes || [],
        },
        !isModal,
      )

      // Meta Pixel — content_ids must match catalogue feed <g:id> (product.id)
      trackAddToCart({
        contentIds: productId,
        value: price * selectedQuantity,
        currency: 'TND',
        contents: [
          {
            id: productId,
            quantity: selectedQuantity,
            item_price: price,
          },
        ],
      })

      // First-party analytics
      trackAnalyticsAddToCart({
        productId,
        value: price * selectedQuantity,
        quantity: selectedQuantity,
        name: String(getText(product.productTitle) || product.productTitle || ''),
      })

      window.dispatchEvent(new CustomEvent('open-cart-dropdown'))

      if (isModal) onAdded?.()
    } catch (err) {
      console.error('addItem error:', err)
    }

    setTimeout(() => setIsAddingToCart(false), 500)
  }

  const handleBuyNow = () => {
    if (!canPurchase) return

    const imageUrl = getProductImage(product)
    const selectedAttributes = getSelectedAttributesForCart()
    const variantId = selectedVariant?.id || null
    const productId = String(product.id)

    try {
      // Express checkout: does NOT modify the panier — only commande shows this product
      startExpressCheckout({
        productId,
        variantId: variantId ? String(variantId) : null,
        slug: String(getText(product.slug as any) || product.slug || ''),
        title: String(getText(product.productTitle) || product.productTitle || ''),
        image: imageUrl || undefined,
        quantity: selectedQuantity,
        price: Number(currentPrice) || 0,
        oldPrice: currentOldPrice != null ? Number(currentOldPrice) : undefined,
        stock: currentStock,
        selectedAttributes: selectedAttributes || [],
      })
      trackBeginCheckout({
        productId,
        name: String(getText(product.productTitle) || product.productTitle || ''),
        value: (Number(currentPrice) || 0) * selectedQuantity,
        quantity: selectedQuantity,
        itemCount: selectedQuantity,
      })

      // productId in URL so the server can load the product even if panier is empty
      const qs = new URLSearchParams({ productId })
      if (variantId) qs.set('variantId', String(variantId))
      qs.set('qty', String(selectedQuantity))
      router.push(`/${locale}/commande?${qs.toString()}`)
    } catch (err) {
      console.error('startExpressCheckout error:', err)
      const qs = new URLSearchParams({ productId })
      if (variantId) qs.set('variantId', String(variantId))
      qs.set('qty', String(selectedQuantity))
      router.push(`/${locale}/commande?${qs.toString()}`)
    }
  }

  const inWishlist = mounted && product?.id ? isInWishlist(String(product.id)) : false

  const handleToggleWishlist = () => {
    if (!product?.id) return

    const productId = String(product.id)
    const title = String(getText(product.productTitle) || product.productTitle || '')
    const wasInWishlist = inWishlist

    toggleItem({
      productId,
      slug: String(getText(product.slug as any) || product.slug || ''),
      title,
      image: getProductImage(product) || undefined,
      currentPrice: Number(currentPrice) || 0,
      oldPrice: currentOldPrice != null ? Number(currentOldPrice) : undefined,
    })

    if (wasInWishlist) {
      trackRemoveFromWishlist({ productId, name: title })
    } else {
      trackAddToWishlist({
        productId,
        value: Number(currentPrice) || 0,
        name: title,
        source: 'product_page',
      })
    }
  }

  const additionalInfoTitle = product.additionalInfoTitle
    ? getText(product.additionalInfoTitle)
    : copy.details

  const favoriteLabel = inWishlist
    ? t.removeFavorite || 'Retirer des favoris'
    : t.addFavorite || 'Ajouter aux favoris'

  const averageRating = Number(product.averageRating) || 0
  const reviewCount = Number(product.reviewCount) || 0

  // Fiche produit + fil d'Ariane pour Google. Pas en mode modale : la page
  // derrière a déjà ses propres données structurées.
  const category = categoryDocs[0]
  const structuredData = isModal
    ? null
    : [
        generateProductSchema(product, locale, {
          reviews: reviews?.docs,
          excludeImageIds: seoExcludedImageIds,
        }),
        generateBreadcrumbSchema([
          { name: BREADCRUMB_HOME[locale], url: `/${locale}` },
          ...(category ? [{ name: localized(category.title, locale), url: categoryURL(category, locale) }] : []),
          { name: localized(product.productTitle, locale), url: productURL(product, locale) },
        ]),
      ]

  const productTitle = getText(product.productTitle)
  const subtitleText = getText(product.subtitle)
  const descriptionText = getText(product.description)
  const categoryTitle = category ? getText(category.title as any) : ''
  const categoryHref = category
    ? `/${locale}/categorie/${localized(category.slug, locale) || category.id}`
    : `/${locale}/boutique`

  const specifications = Array.isArray(product.specifications) ? product.specifications : []
  const hasSpecifications = specifications.length > 0

  const oldPrice = currentOldPrice != null ? Number(currentOldPrice) : 0
  const hasOldPrice = oldPrice > currentPrice
  const discount =
    promoPercentage > 0
      ? Math.round(promoPercentage)
      : hasOldPrice
        ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
        : 0

  const stock = Number(currentStock) || 0
  const isLowStock = canPurchase && stock > 0 && stock <= LOW_STOCK_THRESHOLD
  const actionLabel = isOutOfStock || isUnavailableCombination ? unavailableLabel : copy.addToCart

  const reviewsLabel =
    reviewCount === 1
      ? t.productReviews.oneReview
      : t.productReviews.reviewsCount.replace('{count}', String(reviewCount))

  const stockLine = !allAttributesSelected ? (
    <p className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/20" />
      {copy.chooseOptions}
    </p>
  ) : !canPurchase ? (
    <p className="flex items-center gap-2.5 text-[13px] text-destructive">
      <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
      {unavailableLabel}
    </p>
  ) : isLowStock ? (
    <p className="flex items-center gap-2.5 text-[13px] text-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-gold" />
      {copy.lowStock.replace('{count}', String(stock))}
    </p>
  ) : (
    <p className="flex items-center gap-2.5 text-[13px] text-foreground">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green/50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
      </span>
      {copy.inStock}
    </p>
  )

  return (
    <div
      className={cn('w-full bg-background', isModal ? '' : 'pb-28 lg:pb-0')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <div className={cn(isModal ? 'w-full' : 'mx-auto max-w-7xl px-4 pt-6 sm:px-6 md:pt-10 lg:px-8')}>
        {!isModal && (
          <nav aria-label={copy.breadcrumb} className="mb-6 md:mb-8">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
              <li>
                <Link href={`/${locale}`} className="transition-colors hover:text-foreground">
                  {BREADCRUMB_HOME[locale as Locale] || BREADCRUMB_HOME.fr}
                </Link>
              </li>
              {categoryTitle && (
                <>
                  <li aria-hidden className="text-foreground/25">/</li>
                  <li>
                    <Link href={categoryHref} className="transition-colors hover:text-foreground">
                      {categoryTitle}
                    </Link>
                  </li>
                </>
              )}
              <li aria-hidden className="text-foreground/25">/</li>
              <li aria-current="page" className="max-w-[16rem] truncate text-foreground/70">
                {productTitle}
              </li>
            </ol>
          </nav>
        )}

        <div
          className={cn(
            'grid grid-cols-1',
            isModal
              ? 'gap-6 sm:grid-cols-2'
              : 'gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12 xl:gap-16',
          )}
        >
          {/* Galerie : carrousel sur mobile, grandes images empilées sur desktop. */}
          <div className="min-w-0">
            <ProductGallery
              images={displayImages}
              activeIndex={selectedImageIndex}
              onImageChange={setSelectedImageIndex}
              enableZoom={!isModal}
              layout={isModal ? 'carousel' : 'auto'}
            />
          </div>

          {/* Colonne d'achat, collante sur desktop. */}
          <div className={cn('min-w-0', !isModal && 'lg:sticky lg:top-28 lg:self-start lg:pb-10')}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                {categoryTitle && (
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {isModal ? (
                      categoryTitle
                    ) : (
                      <Link href={categoryHref} className="transition-colors hover:text-foreground">
                        {categoryTitle}
                      </Link>
                    )}
                  </p>
                )}
                <h1
                  className={cn(
                    'text-balance font-heading font-normal leading-[1.15] tracking-tight text-foreground',
                    isModal ? 'text-2xl' : 'text-3xl md:text-4xl',
                  )}
                >
                  {productTitle}
                </h1>
              </div>

              {product?.id && (
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  aria-pressed={inWishlist}
                  aria-label={favoriteLabel}
                  title={favoriteLabel}
                  className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-foreground transition-colors duration-200 hover:bg-muted"
                >
                  <Heart
                    className={cn(
                      'h-5 w-5 transition-colors duration-200',
                      inWishlist && 'fill-brand-pink text-brand-pink',
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              )}
            </div>

            {reviewCount > 0 && (
              <a
                href={isModal ? undefined : '#avis'}
                className="mt-3 inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <StarRating value={averageRating} starClassName="h-3.5 w-3.5" />
                <span className="underline-offset-4 hover:underline">
                  {averageRating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} · {reviewsLabel}
                </span>
              </a>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={cn('font-medium text-foreground', isModal ? 'text-xl' : 'text-2xl')}>
                {formatPrice(currentPrice)}
              </span>
              {hasOldPrice && (
                <span className="text-base text-muted-foreground line-through">{formatPrice(oldPrice)}</span>
              )}
              {discount > 0 && (
                <span className="rounded-full bg-brand-blush px-2.5 py-1 text-xs font-medium text-foreground">
                  {`-${discount}%`}
                </span>
              )}
            </div>

            {subtitleText && (
              <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">{subtitleText}</p>
            )}

            {product.barcode && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t.productReference}{' '}
                <span className="select-all tabular-nums" dir="ltr">
                  {product.barcode}
                </span>
              </p>
            )}

            {attributes.length > 0 && (
              <div className="mt-8 space-y-6 border-t border-border pt-6">
                {attributes.map((attribute: any, attributeIndex: number) => {
                  const attributeId = String(getAttributeId(attribute))
                  const attributeName = getAttributeName(attribute)
                  const values = getValues(attributeId)
                  if (!values.length) return null

                  // Couleur : toutes les valeurs portent un code hexadécimal.
                  const isColorAttribute =
                    values.every((v: any) => typeof v === 'object' && HEX_RE.test(String(v?.value || ''))) ||
                    (isColorName(attributeName) &&
                      values.some((v: any) => typeof v === 'object' && HEX_RE.test(String(v?.value || ''))))

                  const selectedId = selectedValues[attributeId]
                  const selectedValue = values.find((v: any) => String(getValueId(v)) === String(selectedId))

                  return (
                    <fieldset key={attributeId}>
                      <legend className="mb-3 text-[13px] text-muted-foreground">
                        {attributeName} :{' '}
                        {selectedValue && (
                          <span className="font-medium text-foreground">{getValueName(selectedValue)}</span>
                        )}
                      </legend>
                      <div className={cn('flex flex-wrap', isColorAttribute ? 'gap-3' : 'gap-2')}>
                        {values.map((value: any) => {
                          const valueId = String(getValueId(value) || '')
                          const valueName = getValueName(value)
                          const isSelected = String(selectedId) === valueId
                          const available = isValueAvailable(attributeIndex, valueId)
                          const hex = typeof value === 'object' ? String(value?.value || '') : ''

                          if (isColorAttribute) {
                            return (
                              <button
                                key={valueId || valueName}
                                type="button"
                                onClick={() => selectValue(attributeId, valueId)}
                                aria-label={valueName}
                                aria-pressed={isSelected}
                                title={valueName}
                                className={cn(
                                  'relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200',
                                  isSelected ? 'border-foreground' : 'border-transparent hover:border-foreground/30',
                                )}
                              >
                                <span
                                  className={cn(
                                    'h-7 w-7 rounded-full border border-foreground/10',
                                    !available && 'opacity-40',
                                  )}
                                  style={HEX_RE.test(hex) ? { backgroundColor: hex } : undefined}
                                />
                                {!available && (
                                  <span
                                    aria-hidden
                                    className="pointer-events-none absolute h-px w-8 rotate-45 bg-foreground/50"
                                  />
                                )}
                              </button>
                            )
                          }

                          return (
                            <button
                              key={valueId || valueName}
                              type="button"
                              onClick={() => selectValue(attributeId, valueId)}
                              aria-pressed={isSelected}
                              className={cn(
                                'h-11 min-w-12 rounded-full border px-4 text-sm transition-colors duration-200',
                                isSelected
                                  ? 'border-foreground bg-foreground text-background'
                                  : available
                                    ? 'border-foreground/15 text-foreground hover:border-foreground/40'
                                    : 'border-foreground/10 text-muted-foreground/70 line-through',
                              )}
                            >
                              {valueName}
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>
                  )
                })}
              </div>
            )}

            {/* Bloc d'achat : quantité + panier, puis achat direct. */}
            <div ref={purchaseRef} className={cn('space-y-3', attributes.length > 0 ? 'mt-8' : 'mt-8 border-t border-border pt-6')}>
              <div className="flex items-stretch gap-3">
                <div
                  className="inline-flex h-12 shrink-0 items-center rounded-full border border-foreground/15"
                  role="group"
                  aria-label={copy.quantity}
                >
                  <button
                    type="button"
                    aria-label={copy.decrease}
                    onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                    disabled={selectedQuantity <= 1 || isOutOfStock}
                    className="inline-flex h-12 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <span className="w-7 text-center text-sm font-medium tabular-nums" aria-live="polite">
                    {selectedQuantity}
                  </span>
                  <button
                    type="button"
                    aria-label={copy.increase}
                    onClick={() =>
                      setSelectedQuantity(Math.min(Math.max(currentStock, 1), selectedQuantity + 1))
                    }
                    disabled={isOutOfStock || selectedQuantity >= currentStock}
                    className="inline-flex h-12 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || !canPurchase}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isAddingToCart ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={1.5} />
                      {copy.added}
                    </>
                  ) : (
                    actionLabel
                  )}
                </button>
              </div>

              {!isModal && (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!canPurchase}
                  className="flex h-12 w-full items-center justify-center rounded-full border border-foreground/15 bg-transparent px-6 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isOutOfStock || isUnavailableCombination ? unavailableLabel : copy.buyNow}
                </button>
              )}
            </div>

            <div className="mt-5">{stockLine}</div>

            {!isModal && (
              <ul className="mt-6 space-y-3 rounded-2xl bg-brand-mist px-5 py-4 text-[13px] text-foreground">
                <li className="flex items-center gap-3">
                  <Truck className="h-4 w-4 shrink-0 text-brand-pink" strokeWidth={1.5} />
                  {copy.reassureDelivery}
                </li>
                <li className="flex items-center gap-3">
                  <Banknote className="h-4 w-4 shrink-0 text-brand-pink" strokeWidth={1.5} />
                  {copy.reassurePayment}
                </li>
                <li className="flex items-center gap-3">
                  <RefreshCcw className="h-4 w-4 shrink-0 text-brand-pink" strokeWidth={1.5} />
                  {copy.reassureExchange}
                </li>
              </ul>
            )}

            {(descriptionText || (!isModal && hasSpecifications) || !isModal) && (
              <div className="mt-8 border-t border-border">
                {descriptionText && (
                  <Accordion title={t.description || 'Description'} defaultOpen>
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                      {descriptionText}
                    </p>
                  </Accordion>
                )}

                {/* Libellé étroit, valeur alignée au début de sa colonne : la
                    lecture se fait ligne à ligne. */}
                {!isModal && hasSpecifications && (
                  <Accordion title={additionalInfoTitle}>
                    <dl className="divide-y divide-border">
                      {specifications.map((spec: any, index: number) => (
                        <div key={index} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3">
                          <dt className="text-sm text-muted-foreground first-letter:uppercase">
                            {getText(spec.label)}
                          </dt>
                          <dd className="text-sm text-foreground first-letter:uppercase">{getText(spec.value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </Accordion>
                )}

                {!isModal && (
                  <Accordion title={copy.shipping}>
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                      {copy.shippingText}
                    </p>
                  </Accordion>
                )}
              </div>
            )}
          </div>
        </div>

        {!isModal && reviews && (
          <ProductReviews
            productId={String(product.id)}
            averageRating={averageRating}
            reviewCount={reviewCount}
            initialReviews={reviews}
          />
        )}

        {!isModal && related && related.length > 0 && (
          // data-nosnippet : Google ne doit pas reprendre le texte des autres
          // produits comme description de celui-ci dans ses résultats.
          <section className="mt-20 border-t border-border pt-16 pb-16 md:mt-24 md:pt-20 md:pb-24" data-nosnippet>
            <SectionHeading title={t.relatedProducts || 'Produits similaires'} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Barre d'achat mobile : apparaît quand le bloc d'achat est sorti de l'écran par le haut. */}
      {!isModal && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 lg:hidden',
            purchaseVisible ? 'translate-y-full' : 'translate-y-0',
          )}
          aria-hidden={purchaseVisible}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-muted-foreground">{productTitle}</p>
              <p className="text-base font-medium text-foreground">{formatPrice(currentPrice)}</p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !canPurchase}
              tabIndex={purchaseVisible ? -1 : 0}
              className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isAddingToCart ? copy.added : actionLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
