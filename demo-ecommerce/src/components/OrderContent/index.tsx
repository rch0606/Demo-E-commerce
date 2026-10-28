'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCartStore } from '@/stores/cart'
import {
  ArrowLeft,
  ShoppingBag,
  Minus,
  Plus,
  Pencil,
  Tag,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { OrderForm } from '@/components/OrderForm'
import { ProductQuickAddDialog } from '@/components/ProductQuickAddDialog'
import type { Product } from '@/payload-types'
import { PromoCodeDoc } from '@/utilities/promoCodes'
import { trackApplyPromo } from '@/lib/analytics'
import { getProductPromoPercentage, getPromoPricing } from '@/lib/categoryPromo'
import { FREE_DELIVERY_THRESHOLD } from '@/components/CartDrawer'



interface OrderPageContentProps {
  products: Product[]
  initialItems: any[]
  locale: string
  /** From ?productId= when user clicked "Acheter maintenant" */
  expressProductId?: string | null
  expressVariantId?: string | null
  expressQty?: number
  /** Réglage boutique, résolu côté serveur par la page /commande. */
  deliveryFee?: number
}

// Helper to get product image URL safely
const getProductImageUrl = (product: any): string | null => {
  if (!product) return null

  if (product.featuredImage) {
    if (typeof product.featuredImage === 'string') {
      return product.featuredImage
    }
    if (product.featuredImage.url) {
      return product.featuredImage.url
    }
  }

  if (product.gallery && product.gallery.length > 0) {
    const firstImage = product.gallery[0]?.image
    if (firstImage) {
      if (typeof firstImage === 'string') {
        return firstImage
      }
      if (firstImage.url) {
        return firstImage.url
      }
    }
  }

  return null
}

export function OrderPageContent({
  products,
  initialItems,
  locale,
  expressProductId = null,
  expressVariantId = null,
  expressQty = 1,
  deliveryFee: baseDeliveryFee = 0,
}: OrderPageContentProps) {
  const {
    items,
    getTotalItems,
    getTotalPrice,
    updateQuantity,
    removeItem,
    expressItem,
    hydrateExpressCheckout,
    startExpressCheckout,
  } = useCartStore()
  const [isMounted, setIsMounted] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  // Mobile: order summary collapsed by default (Shopify-style bar)
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Promo code (under product cards)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeDoc | null>(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)

  // Build a temporary express line from the product loaded on the server
  // (used until sessionStorage / Zustand expressItem is ready)
  const fallbackExpressItem = useMemo(() => {
    if (!expressProductId || !products?.length) return null
    const product = products.find((p) => String(p.id) === String(expressProductId))
    if (!product) return null

    const variantDocs =
      (product as any)?.variants?.docs ||
      (Array.isArray((product as any)?.variants) ? (product as any).variants : [])

    const selectedVariant =
      (expressVariantId &&
        variantDocs.find((v: any) => String(v.id) === String(expressVariantId))) ||
      (product as any).initialVariant ||
      variantDocs[0] ||
      null

    // Rebuild selected attributes from variant combination
    const selectedAttributes: { attribute: string; value: string }[] = []
    const combination = selectedVariant?.combination
    if (Array.isArray(combination)) {
      for (const item of combination) {
        if (!item || typeof item !== 'object') continue
        const attrObj = item.attribute
        const attrName =
          typeof attrObj === 'object'
            ? attrObj?.label || attrObj?.name || attrObj?.title || ''
            : typeof attrObj === 'string'
              ? attrObj
              : ''
        const valueName =
          item.label || item.value || item.name || ''
        if (attrName && valueName) {
          selectedAttributes.push({
            attribute: String(attrName),
            value: String(valueName),
          })
        }
      }
    }

    const title =
      typeof (product as any).productTitle === 'string'
        ? (product as any).productTitle
        : (product as any).productTitle?.[locale] ||
          (product as any).productTitle?.fr ||
          (product as any).productTitle?.en ||
          ''
    const slug =
      typeof (product as any).slug === 'string'
        ? (product as any).slug
        : (product as any).slug?.[locale] ||
          (product as any).slug?.fr ||
          (product as any).slug?.en ||
          ''
    let image: string | undefined
    const fi = (product as any).featuredImage
    if (typeof fi === 'string') image = fi
    else if (fi?.url) image = fi.url

    const basePrice =
      Number(selectedVariant?.price) ||
      Number((product as any).currentPrice) ||
      0
    const baseOldPrice =
      selectedVariant?.oldPrice ?? (product as any).oldPrice ?? null

    const { price, oldPrice } = getPromoPricing(
      basePrice,
      baseOldPrice,
      getProductPromoPercentage(product),
    )

    const stock =
      Number(selectedVariant?.stock) ||
      Number((product as any).totalStock) ||
      99

    return {
      id: `express-fallback-${product.id}`,
      productId: String(product.id),
      variantId: selectedVariant?.id ? String(selectedVariant.id) : null,
      slug: String(slug),
      title: String(title),
      image,
      quantity: expressQty || 1,
      price,
      oldPrice,
      stock,
      selectedAttributes,
    }
  }, [expressProductId, expressVariantId, expressQty, products, locale])

  useEffect(() => {
    hydrateExpressCheckout()

    // Ensure express checkout is set when arriving via ?productId=
    if (expressProductId && products?.length) {
      const fromSession =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('express-checkout')
          : null

      if (!fromSession && fallbackExpressItem) {
        startExpressCheckout({
          productId: fallbackExpressItem.productId,
          variantId: fallbackExpressItem.variantId,
          slug: fallbackExpressItem.slug,
          title: fallbackExpressItem.title,
          image: fallbackExpressItem.image,
          quantity: fallbackExpressItem.quantity,
          price: fallbackExpressItem.price,
          oldPrice: fallbackExpressItem.oldPrice ?? undefined,
          stock: fallbackExpressItem.stock,
          selectedAttributes: fallbackExpressItem.selectedAttributes,
        })
      }
    }

    setIsMounted(true)
  }, [
    hydrateExpressCheckout,
    expressProductId,
    products,
    startExpressCheckout,
    fallbackExpressItem,
  ])

  const isExpress = isMounted && (!!expressItem || !!fallbackExpressItem)

  // Express checkout: only the buy-now product. Otherwise normal cart
  // (fallback to SSR cookie items until Zustand rehydrates).
  // If session express item lost attributes, merge from URL-based fallback.
  const resolvedExpress =
    expressItem && fallbackExpressItem
      ? {
          ...expressItem,
          variantId: expressItem.variantId || fallbackExpressItem.variantId,
          selectedAttributes:
            expressItem.selectedAttributes?.length
              ? expressItem.selectedAttributes
              : fallbackExpressItem.selectedAttributes,
          price: expressItem.price || fallbackExpressItem.price,
          oldPrice: expressItem.oldPrice ?? fallbackExpressItem.oldPrice ?? undefined,
          quantity: expressItem.quantity || fallbackExpressItem.quantity,
        }
      : expressItem || fallbackExpressItem

  const cartItems = resolvedExpress
    ? [resolvedExpress]
    : items.length > 0
      ? items
      : initialItems

  const totalItems = resolvedExpress
    ? resolvedExpress.quantity || 1
    : items.length > 0
      ? getTotalItems()
      : initialItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)

  const subtotal = resolvedExpress
    ? (resolvedExpress.price || 0) * (resolvedExpress.quantity || 1)
    : items.length > 0
      ? getTotalPrice()
      : initialItems.reduce(
          (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1),
          0,
        )

  // Livraison offerte au-delà du seuil affiché dans le panier.
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : baseDeliveryFee

  // La remise porte sur les articles, jamais sur la livraison.
  const totalPrice = Math.max(0, subtotal - promoDiscount) + deliveryFee

  const cartProductIds = useMemo(
    () =>
      (cartItems || [])
        .map((item: any) => String(item.productId || ''))
        .filter(Boolean),
    [cartItems],
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(
      locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
      {
        style: 'currency',
        currency: 'TND',
      },
    ).format(price)
  }

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      setPromoError(
        locale === 'fr'
          ? 'Veuillez entrer un code promo'
          : locale === 'ar'
            ? 'يرجى إدخال رمز ترويجي'
            : 'Please enter a promo code',
      )
      return
    }

    setIsValidatingPromo(true)
    setPromoError(null)

    try {
      const lineItems = (cartItems || []).map((item: any) => ({
        productId: String(item.productId || ''),
        lineTotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
      }))

      const response = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          cartTotal: subtotal,
          productIds: cartProductIds,
          lineItems,
        }),
      })
      const data = await response.json()

      if (data.ok && data.promo) {
        setAppliedPromo(data.promo)
        setPromoDiscount(Number(data.discountAmount) || 0)
        setPromoError(null)
        trackApplyPromo({
          code: String(data.promo.promoCode || promoCodeInput.trim()),
          discountAmount: Number(data.discountAmount) || 0,
        })
      } else {

        setAppliedPromo(null)
        setPromoDiscount(0)
        setPromoError(
          data.message ||
            (locale === 'fr' ? 'Code promo invalide' : 'Invalid promo code'),
        )
      }
    } catch {
      setAppliedPromo(null)
      setPromoDiscount(0)
      setPromoError(
        locale === 'fr'
          ? 'Erreur lors de la validation du code promo'
          : 'Error validating promo code',
      )
    } finally {
      setIsValidatingPromo(false)
    }
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setPromoDiscount(0)
    setPromoCodeInput('')
    setPromoError(null)
  }

  const translations = {
    fr: {
      title: 'Finaliser la commande',
      backToShop: 'Retour à la boutique',
      noProduct: 'Votre panier est vide',
      noProductDesc: 'Ajoutez des produits pour commencer vos achats.',
      productsInCart: 'Vos produits',
      total: 'Total',
      orderForm: 'Informations de commande',
      quantity: 'Qté',
      remove: 'Supprimer',
      subtotal: 'Sous-total',
      items: 'articles',
      promoCode: 'Code promo',
      promoPlaceholder: 'Saisissez votre code',
      apply: 'Appliquer',
      discount: 'Réduction',
      delivery: 'Livraison',
      free: 'Offerte',
      summaryTitle: 'Récapitulatif',
      showSummary: 'Afficher le récapitulatif',
      hideSummary: 'Masquer le récapitulatif',
      stepCart: 'Panier',
      stepInfo: 'Informations',
      stepConfirm: 'Confirmation',
    },
    en: {
      title: 'Complete your order',
      backToShop: 'Back to shop',
      noProduct: 'Your cart is empty',
      noProductDesc: 'Add some products to start shopping.',
      productsInCart: 'Your products',
      total: 'Total',
      orderForm: 'Order information',
      quantity: 'Qty',
      remove: 'Remove',
      subtotal: 'Subtotal',
      items: 'items',
      promoCode: 'Promo code',
      promoPlaceholder: 'Enter your code',
      apply: 'Apply',
      discount: 'Discount',
      delivery: 'Delivery',
      free: 'Free',
      summaryTitle: 'Order summary',
      showSummary: 'Show order summary',
      hideSummary: 'Hide order summary',
      stepCart: 'Cart',
      stepInfo: 'Information',
      stepConfirm: 'Confirmation',
    },
    ar: {
      title: 'أكمل طلبك',
      backToShop: 'العودة إلى المتجر',
      noProduct: 'سلة التسوق فارغة',
      noProductDesc: 'أضف بعض المنتجات لبدء التسوق.',
      productsInCart: 'منتجاتك',
      total: 'المجموع',
      orderForm: 'معلومات الطلب',
      quantity: 'الكمية',
      remove: 'إزالة',
      subtotal: 'المجموع الفرعي',
      items: 'منتجات',
      promoCode: 'رمز ترويجي',
      promoPlaceholder: 'أدخل الرمز',
      apply: 'تطبيق',
      discount: 'خصم',
      delivery: 'التوصيل',
      free: 'مجاني',
      summaryTitle: 'ملخص الطلب',
      showSummary: 'عرض ملخص الطلب',
      hideSummary: 'إخفاء ملخص الطلب',
      stepCart: 'السلة',
      stepInfo: 'المعلومات',
      stepConfirm: 'التأكيد',
    },
  }

  const t = translations[locale as keyof typeof translations] || translations.fr

  // After order submit we clear cart/express — avoid flashing "panier vide" during redirect
  const justSubmitted =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('order-just-submitted') === '1'

  const editingProduct = editingItem
    ? products.find(
        (product) =>
          String(product.id) === String(editingItem.productId),
      )
    : null

  const editingInitialVariant =
    editingItem?.variantId && editingProduct
      ? ((editingProduct as any)?.variants?.docs ||
          (Array.isArray((editingProduct as any)?.variants)
            ? (editingProduct as any).variants
            : [])
        ).find((v: any) => String(v.id) === String(editingItem.variantId))
      : null

  const formatAmount = (price: number) =>
    new Intl.NumberFormat(
      locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
      { minimumFractionDigits: 3, maximumFractionDigits: 3 },
    ).format(price)

  if (
    !isMounted &&
    initialItems.length === 0 &&
    items.length === 0 &&
    !expressProductId &&
    !fallbackExpressItem
  ) {
    return null
  }

  if (
    isMounted &&
    !justSubmitted &&
    cartItems.length === 0 &&
    !expressItem &&
    !expressProductId
  ) {
    return (
      <div className="bg-background">
        <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-mist">
            <ShoppingBag className="h-7 w-7 text-brand-pink" strokeWidth={1.5} />
          </div>
          <h1 className="mt-6 font-heading text-3xl font-normal text-foreground">
            {t.noProduct}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.noProductDesc}</p>
          <Link
            href={`/${locale}/boutique`}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
            {t.backToShop}
          </Link>
        </div>
      </div>
    )
  }

  const editLabel =
    locale === 'ar' ? 'تعديل' : locale === 'en' ? 'Edit' : 'Modifier'

  const summary = (
    <div className="space-y-6">
      {/* Items */}
      <ul className="space-y-4">
        {cartItems.map((item: any) => {
          const product = products.find(
            (p) => String(p.id) === String(item.productId),
          )
          const imageUrl = product ? getProductImageUrl(product) : null
          const displayImage = imageUrl || item.image || null
          const hasDiscount = Number(item.oldPrice) > Number(item.price)

          return (
            <li key={item.id} className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-foreground/10 bg-card">
                  {displayImage ? (
                    <Image
                      src={displayImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag
                        className="h-5 w-5 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    </div>
                  )}
                </div>
                <span className="absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/80 px-1.5 text-[11px] font-medium text-background">
                  {item.quantity}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.title}
                    </h3>
                    {item.selectedAttributes &&
                      item.selectedAttributes.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.selectedAttributes
                            .map((attr: any) => `${attr.attribute} : ${attr.value}`)
                            .join(' · ')}
                        </p>
                      )}
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    {hasDiscount && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(Number(item.oldPrice) * item.quantity)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="inline-flex h-7 items-center rounded-full border border-foreground/15 bg-card">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity === 1}
                      aria-label="-"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                    <span className="w-5 text-center text-xs font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="+"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem({
                        ...item,
                        image: item.image || imageUrl || undefined,
                      })
                      setEditOpen(true)
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-brand-pink hover:underline"
                  >
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                    {editLabel}
                  </button>
                  {item.quantity > 1 && (
                    <span className="ms-auto text-[11px] text-muted-foreground">
                      {formatPrice(item.price)} × {item.quantity}
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Promo code */}
      <div className="border-t border-foreground/10 pt-6">
        {!appliedPromo ? (
          <>
            <div className="flex items-center gap-2">
              <label htmlFor="promo-code" className="sr-only">
                {t.promoCode}
              </label>
              <div className="relative flex-1">
                <Tag
                  className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <input
                  id="promo-code"
                  type="text"
                  value={promoCodeInput}
                  onChange={(e) => {
                    setPromoCodeInput(e.target.value.toUpperCase())
                    setPromoError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyPromo()
                    }
                  }}
                  placeholder={t.promoPlaceholder}
                  disabled={isValidatingPromo}
                  aria-invalid={!!promoError}
                  className={`h-12 w-full min-w-0 rounded-full border bg-card pe-4 ps-10 text-sm uppercase outline-none transition-colors placeholder:normal-case placeholder:text-muted-foreground/80 focus:ring-0 ${
                    promoError
                      ? 'border-destructive'
                      : 'border-input focus:border-foreground/40'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={isValidatingPromo || !promoCodeInput.trim()}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isValidatingPromo ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  t.apply
                )}
              </button>
            </div>
            {promoError && (
              <p className="mt-2 ps-4 text-xs text-destructive">{promoError}</p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-brand-blush px-3 py-1.5 text-xs text-foreground">
              <Tag className="h-3.5 w-3.5 shrink-0 text-brand-pink" strokeWidth={1.5} />
              <span className="truncate font-medium tracking-wide">
                {appliedPromo.promoCode}
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                −
                {appliedPromo.discountType === 'percentage'
                  ? `${appliedPromo.discountValue}%`
                  : `${appliedPromo.discountValue} DT`}
              </span>
              <button
                type="button"
                onClick={handleRemovePromo}
                className="-me-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                title={t.remove}
                aria-label={t.remove}
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2.5 border-t border-foreground/10 pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            {t.subtotal} · {totalItems} {t.items}
          </span>
          <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">{t.delivery}</span>
          <span className="font-medium text-foreground">
            {deliveryFee > 0 ? formatPrice(deliveryFee) : t.free}
          </span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t.discount}</span>
            <span className="font-medium text-brand-pink">
              −{formatPrice(promoDiscount)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-4 border-t border-foreground/10 pt-5">
        <span className="font-heading text-lg font-normal text-foreground">
          {t.total}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">TND</span>
          <span className="font-heading text-3xl font-normal text-foreground">
            {formatAmount(totalPrice)}
          </span>
        </span>
      </div>
    </div>
  )

  return (
    <>
      <div className="bg-background">
        {/* Mobile: collapsible summary bar */}
        <div className="border-b border-foreground/10 bg-brand-mist lg:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((o) => !o)}
            aria-expanded={summaryOpen}
            aria-controls="order-summary"
            className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-6"
          >
            <span className="inline-flex items-center gap-2 text-sm text-brand-pink">
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
              {summaryOpen ? t.hideSummary : t.showSummary}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${summaryOpen ? 'rotate-180' : ''}`}
                strokeWidth={1.5}
              />
            </span>
            <span className="font-heading text-lg font-normal text-foreground">
              {formatPrice(totalPrice)}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[58fr_42fr]">
          {/* Summary column (right on desktop, collapsible on mobile) */}
          <aside
            id="order-summary"
            className={`${summaryOpen ? 'block' : 'hidden'} border-b border-foreground/10 bg-brand-mist lg:col-start-2 lg:row-start-1 lg:block lg:border-b-0 lg:border-s`}
          >
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:sticky lg:top-8 lg:mx-0 lg:max-w-[480px] lg:px-10 lg:py-12 xl:px-12">
              <h2 className="mb-6 hidden font-heading text-xl font-normal text-foreground lg:block">
                {t.summaryTitle}
              </h2>
              {summary}
            </div>
          </aside>

          {/* Form column */}
          <main className="lg:col-start-1 lg:row-start-1">
            <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:me-0 lg:max-w-[680px] lg:pe-12 lg:ps-8 xl:pe-16">
              <nav
                aria-label="Breadcrumb"
                className="mb-8 flex flex-wrap items-center gap-2 text-xs"
              >
                <Link
                  href={`/${locale}/panier`}
                  className="text-brand-pink underline-offset-4 hover:underline"
                >
                  {t.stepCart}
                </Link>
                <ChevronRight
                  className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180"
                  strokeWidth={1.5}
                />
                <span className="font-medium text-foreground" aria-current="step">
                  {t.stepInfo}
                </span>
                <ChevronRight
                  className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180"
                  strokeWidth={1.5}
                />
                <span className="text-muted-foreground">{t.stepConfirm}</span>
              </nav>

              <h1 className="mb-10 font-heading text-3xl font-normal text-foreground md:text-4xl">
                {t.title}
              </h1>

              <OrderForm
                initialItems={initialItems}
                appliedPromoCode={appliedPromo?.promoCode ?? null}
                promoDiscount={promoDiscount}
                deliveryFee={deliveryFee}
              />

              <div className="mt-10 border-t border-foreground/10 pt-6">
                <Link
                  href={`/${locale}/boutique`}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
                  {t.backToShop}
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      <ProductQuickAddDialog
        key={editingItem ? `${editingItem.id}-${editOpen}` : 'empty'}
        productId={editingItem?.productId}
        initialProduct={editingProduct}
        initialVariant={editingInitialVariant}
        preview={{
          title: editingItem?.title,
          image: editingItem?.image,
          slug: editingItem?.slug,
          currentPrice: editingItem?.price,
          oldPrice: editingItem?.oldPrice,
        }}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingItem(null)
        }}
        locale={locale}
        editCartItemId={editingItem?.id ?? null}
        initialQuantity={editingItem?.quantity ?? 1}
      />
    </>
  )
}
