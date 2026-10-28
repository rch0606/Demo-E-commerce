'use client'

import { useCartStore, type CartItem } from '@/stores/cart'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  RefreshCcw,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProductQuickAddDialog } from '@/components/ProductQuickAddDialog'
import {
  FREE_DELIVERY_THRESHOLD,
  FreeDeliveryProgress,
  QuantityStepper,
  formatAmount,
  formatAttributes,
} from '@/components/CartDrawer'
import { useLocale } from '@/lib/locale-context'
import type { Product } from '@/payload-types'

type CartPageClientProps = {
  /** Products for cart lines — fetched on the server (same as /commande) */
  products: Product[]
  locale: string
  /** Réglage boutique, résolu côté serveur. */
  deliveryFee?: number
}

const ICON_STROKE = 1.5

const COPY = {
  fr: {
    eyebrow: 'Panier',
    title: 'Votre panier',
    item: 'article',
    items: 'articles',
    continue: 'Continuer mes achats',
    clear: 'Vider le panier',
    product: 'Produit',
    unitPrice: 'Prix',
    quantity: 'Quantité',
    lineTotal: 'Total',
    edit: 'Modifier',
    remove: 'Retirer',
    emptyTitle: 'Votre panier est vide',
    emptyText: 'Vous n’avez encore rien ajouté. Découvrez nos essentiels et laissez-vous tenter.',
    emptyCta: 'Découvrir la boutique',
    summary: 'Récapitulatif',
    subtotal: 'Sous-total',
    delivery: 'Livraison estimée',
    free: 'Offerte',
    total: 'Total',
    checkout: 'Passer commande',
    promoNote: 'Code promo à saisir à l’étape suivante',
    reassurance: [
      'Paiement à la livraison',
      'Livraison en 24-48h partout en Tunisie',
      'Échange sous 30 jours',
    ],
  },
  en: {
    eyebrow: 'Cart',
    title: 'Your cart',
    item: 'item',
    items: 'items',
    continue: 'Continue shopping',
    clear: 'Clear cart',
    product: 'Product',
    unitPrice: 'Price',
    quantity: 'Quantity',
    lineTotal: 'Total',
    edit: 'Edit',
    remove: 'Remove',
    emptyTitle: 'Your cart is empty',
    emptyText: 'You haven’t added anything yet. Browse our essentials and find something you love.',
    emptyCta: 'Browse the shop',
    summary: 'Order summary',
    subtotal: 'Subtotal',
    delivery: 'Estimated delivery',
    free: 'Free',
    total: 'Total',
    checkout: 'Checkout',
    promoNote: 'Promo codes can be entered at the next step',
    reassurance: [
      'Cash on delivery',
      'Delivery in 24-48h across Tunisia',
      'Exchange within 30 days',
    ],
  },
  ar: {
    eyebrow: 'السلة',
    title: 'سلة التسوق',
    item: 'منتج',
    items: 'منتجات',
    continue: 'مواصلة التسوق',
    clear: 'إفراغ السلة',
    product: 'المنتج',
    unitPrice: 'السعر',
    quantity: 'الكمية',
    lineTotal: 'المجموع',
    edit: 'تعديل',
    remove: 'حذف',
    emptyTitle: 'سلتك فارغة',
    emptyText: 'لم تضف أي منتج بعد. اكتشف منتجاتنا الأساسية واختر ما يعجبك.',
    emptyCta: 'تصفح المتجر',
    summary: 'ملخص الطلب',
    subtotal: 'المجموع الفرعي',
    delivery: 'التوصيل (تقديري)',
    free: 'مجاني',
    total: 'المجموع',
    checkout: 'إتمام الطلب',
    promoNote: 'يمكن إدخال رمز التخفيض في الخطوة التالية',
    reassurance: [
      'الدفع عند الاستلام',
      'توصيل خلال 24-48 ساعة في كامل تونس',
      'استبدال خلال 30 يومًا',
    ],
  },
} as const

const REASSURANCE_ICONS = [Banknote, Truck, RefreshCcw]

export function CartPageClient({ products, locale, deliveryFee = 0 }: CartPageClientProps) {
  const {
    items,
    removeItem,
    getTotalItemsCount,
    getTotalPrice,
    clearCart,
    clearExpressCheckout,
  } = useCartStore()
  const { t } = useLocale()
  const currency = t?.currency || 'DT'
  const copy = COPY[(locale in COPY ? locale : 'fr') as keyof typeof COPY]
  const isRTL = locale === 'ar'

  // Le panier est lu depuis le localStorage : on attend le montage pour éviter un écart d'hydratation.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const totalItemsCount = mounted ? getTotalItemsCount() : 0
  const totalPrice = mounted ? getTotalPrice() : 0
  const cartItems = mounted ? items : []

  // Estimation : livraison offerte au-delà du seuil annoncé, sinon frais boutique.
  const estimatedDelivery = totalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryFee

  const [editOpen, setEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CartItem | null>(null)

  const productsById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const p of products) {
      if (p?.id != null) map.set(String(p.id), p)
    }
    return map
  }, [products])

  const handleOpenEdit = useCallback((item: CartItem) => {
    const id = String(item.productId || '').trim()
    if (!id) {
      console.error('[panier] cart item missing productId', item)
      return
    }
    setEditingItem(item)
    setEditOpen(true)
  }, [])

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open)
    if (!open) setEditingItem(null)
  }

  const editingProduct = editingItem
    ? productsById.get(String(editingItem.productId)) ?? null
    : null

  const editingInitialVariant =
    editingItem?.variantId && editingProduct
      ? (
          (editingProduct as any)?.variants?.docs ||
          (Array.isArray((editingProduct as any)?.variants)
            ? (editingProduct as any).variants
            : [])
        ).find((v: any) => String(v.id) === String(editingItem.variantId))
      : null

  const goToCheckout = () => {
    clearExpressCheckout()
    window.location.assign(`/${locale}/commande`)
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-16 sm:px-6 md:pt-12 md:pb-24 lg:px-8">
        {/* En-tête de page */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6 md:pb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{copy.eyebrow}</p>
            <h1 className="mt-2 font-heading text-3xl font-normal text-foreground md:text-5xl">
              {copy.title}
              {totalItemsCount > 0 && (
                <span className="ms-3 align-middle font-sans text-base text-muted-foreground md:text-lg">
                  ({totalItemsCount} {totalItemsCount > 1 ? copy.items : copy.item})
                </span>
              )}
            </h1>
          </div>
          <Link
            href={`/${locale}/boutique`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
          >
            <BackArrow className="h-4 w-4" strokeWidth={ICON_STROKE} />
            {copy.continue}
          </Link>
        </div>

        {!mounted ? (
          <div className="min-h-[40vh]" aria-hidden />
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-20 text-center md:py-28">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-mist">
              <ShoppingBag className="h-8 w-8 text-brand-pink" strokeWidth={ICON_STROKE} />
            </div>
            <h2 className="font-heading text-2xl font-normal text-foreground md:text-3xl">{copy.emptyTitle}</h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">{copy.emptyText}</p>
            <Link
              href={`/${locale}/boutique`}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm text-primary-foreground no-underline transition-opacity hover:opacity-90"
            >
              {copy.emptyCta}
              <ForwardArrow className="h-4 w-4" strokeWidth={ICON_STROKE} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 pt-2 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
            {/* Lignes du panier */}
            <section>
              {/* En-têtes alignés sur la grille des lignes (image 120px + gap 24px) */}
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_110px] gap-6 border-b border-border py-4 ps-[144px] text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
                <span>{copy.product}</span>
                <span>{copy.quantity}</span>
                <span className="text-end">{copy.lineTotal}</span>
              </div>

              <ul className="divide-y divide-border">
                {cartItems.map((item) => {
                  const attributes = formatAttributes(item)
                  const hasDiscount = Number(item.oldPrice) > Number(item.price)
                  return (
                    <li
                      key={item.id}
                      className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-6 md:grid-cols-[120px_minmax(0,1fr)] md:gap-6"
                    >
                      <Link
                        href={`/${locale}/produit/${item.slug}`}
                        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-brand-mist"
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground/50" strokeWidth={ICON_STROKE} />
                          </span>
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_140px_110px] md:items-start md:gap-6">
                        {/* Titre + attributs + prix unitaire */}
                        <div className="min-w-0">
                          <Link
                            href={`/${locale}/produit/${item.slug}`}
                            className="font-heading text-base font-normal text-foreground no-underline transition-colors hover:text-brand-pink md:text-lg"
                          >
                            {item.title}
                          </Link>
                          {attributes && (
                            <p className="mt-1 text-[13px] text-muted-foreground">{attributes}</p>
                          )}
                          <p className="mt-2 text-sm text-foreground">
                            {formatAmount(item.price, currency)}
                            {hasDiscount && (
                              <span className="ms-2 text-muted-foreground line-through">
                                {formatAmount(Number(item.oldPrice), currency)}
                              </span>
                            )}
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-xs">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                            >
                              {copy.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                            >
                              {copy.remove}
                            </button>
                          </div>
                        </div>

                        {/* Stepper + total de ligne */}
                        <div className="flex items-center justify-between gap-3 md:contents">
                          <div>
                            <QuantityStepper item={item} locale={locale} size="md" />
                          </div>
                          <div className="text-end">
                            <p className="text-sm font-medium text-foreground md:text-base">
                              {formatAmount(item.price * item.quantity, currency)}
                            </p>
                            {hasDiscount && (
                              <p className="text-xs text-muted-foreground line-through">
                                {formatAmount(Number(item.oldPrice) * item.quantity, currency)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="flex justify-end border-t border-border pt-5">
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-destructive"
                >
                  {copy.clear}
                </button>
              </div>
            </section>

            {/* Récapitulatif */}
            <aside className="lg:sticky lg:top-40 lg:self-start">
              <div className="rounded-3xl bg-brand-mist p-6 md:p-8">
                <h2 className="font-heading text-2xl font-normal text-foreground">{copy.summary}</h2>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {copy.subtotal} ({totalItemsCount} {totalItemsCount > 1 ? copy.items : copy.item})
                    </dt>
                    <dd className="font-medium text-foreground">{formatAmount(totalPrice, currency)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{copy.delivery}</dt>
                    <dd className="font-medium text-foreground">
                      {estimatedDelivery > 0 ? (
                        formatAmount(estimatedDelivery, currency)
                      ) : (
                        <span className="text-brand-green">{copy.free}</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <FreeDeliveryProgress
                  subtotal={totalPrice}
                  locale={locale}
                  currency={currency}
                  className="mt-6 border-t border-foreground/10 pt-5"
                />

                <div className="mt-6 flex items-baseline justify-between border-t border-foreground/10 pt-5">
                  <span className="text-sm text-foreground">{copy.total}</span>
                  <span className="font-heading text-3xl font-normal text-foreground">
                    {formatAmount(totalPrice + estimatedDelivery, currency)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={goToCheckout}
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {copy.checkout}
                  <ForwardArrow className="h-4 w-4" strokeWidth={ICON_STROKE} />
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">{copy.promoNote}</p>

                <ul className="mt-6 space-y-3 border-t border-foreground/10 pt-5">
                  {copy.reassurance.map((label, i) => {
                    const Icon = REASSURANCE_ICONS[i]
                    return (
                      <li key={label} className="flex items-center gap-3 text-[13px] text-foreground">
                        <Icon className="h-4 w-4 shrink-0 text-brand-pink" strokeWidth={ICON_STROKE} aria-hidden />
                        {label}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>

      <ProductQuickAddDialog
        key={
          editingItem
            ? `panier-edit-${editingItem.id}-${editOpen}`
            : 'panier-edit-empty'
        }
        productId={editingItem?.productId}
        initialProduct={editingProduct}
        initialVariant={editingInitialVariant}
        preview={
          editingItem
            ? {
                title: editingItem.title,
                image: editingItem.image,
                slug: editingItem.slug,
                currentPrice: editingItem.price,
                oldPrice: editingItem.oldPrice,
              }
            : undefined
        }
        open={editOpen}
        onOpenChange={handleEditOpenChange}
        locale={locale}
        editCartItemId={editingItem?.id ?? null}
        initialQuantity={editingItem?.quantity ?? 1}
      />
    </div>
  )
}
