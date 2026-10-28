'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Truck, X } from 'lucide-react'

import { useCartStore, type CartItem } from '@/stores/cart'
import { useLocale } from '@/lib/locale-context'
import { cn } from '@/utilities/ui'

/**
 * Seuil de livraison offerte, en DT.
 * Aucun réglage boutique ne le porte encore (ShopSettings n'a que `deliveryFee`) :
 * c'est le montant annoncé par l'AnnouncementBar (« Livraison gratuite dès 200 DT »).
 * À déplacer dans ShopSettings si le seuil doit devenir éditable.
 */
export const FREE_DELIVERY_THRESHOLD = 200

const ICON_STROKE = 1.5

type Lang = 'fr' | 'en' | 'ar'

export const CART_COPY = {
  fr: {
    cart: 'Panier',
    close: 'Fermer le panier',
    remaining: (amount: string) => `Plus que ${amount} pour la livraison offerte`,
    freeDelivery: 'Livraison offerte !',
    emptyTitle: 'Votre panier est vide',
    emptyText: 'Découvrez nos essentiels et laissez-vous tenter.',
    emptyCta: 'Découvrir la boutique',
    subtotal: 'Sous-total',
    note: 'Livraison et code promo calculés à l’étape suivante',
    checkout: 'Commander',
    viewCart: 'Voir le panier',
    remove: 'Retirer',
    decrease: 'Diminuer la quantité',
    increase: 'Augmenter la quantité',
    item: 'article',
    items: 'articles',
  },
  en: {
    cart: 'Cart',
    close: 'Close cart',
    remaining: (amount: string) => `Only ${amount} away from free delivery`,
    freeDelivery: 'Free delivery unlocked!',
    emptyTitle: 'Your cart is empty',
    emptyText: 'Browse our essentials and find something you love.',
    emptyCta: 'Browse the shop',
    subtotal: 'Subtotal',
    note: 'Delivery and promo codes calculated at the next step',
    checkout: 'Checkout',
    viewCart: 'View cart',
    remove: 'Remove',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    item: 'item',
    items: 'items',
  },
  ar: {
    cart: 'السلة',
    close: 'إغلاق السلة',
    remaining: (amount: string) => `تبقّى ${amount} للحصول على توصيل مجاني`,
    freeDelivery: 'التوصيل مجاني!',
    emptyTitle: 'سلتك فارغة',
    emptyText: 'اكتشف منتجاتنا الأساسية واختر ما يعجبك.',
    emptyCta: 'تصفح المتجر',
    subtotal: 'المجموع الفرعي',
    note: 'يتم احتساب التوصيل ورمز التخفيض في الخطوة التالية',
    checkout: 'إتمام الطلب',
    viewCart: 'عرض السلة',
    remove: 'حذف',
    decrease: 'إنقاص الكمية',
    increase: 'زيادة الكمية',
    item: 'منتج',
    items: 'منتجات',
  },
} as const

export function getCartCopy(locale: string) {
  return CART_COPY[(locale in CART_COPY ? locale : 'fr') as Lang]
}

/** Même rendu que les cartes produit : « 45 DT ». */
export function formatAmount(value: number | null | undefined, currency = 'DT') {
  const n = Number(value)
  return `${(Number.isFinite(n) ? n : 0).toLocaleString('fr-FR')} ${currency}`
}

/** Libellé lisible des attributs choisis (« Couleur : Sable · Taille : M »). */
export function formatAttributes(item: Pick<CartItem, 'selectedAttributes'>) {
  return (item.selectedAttributes ?? [])
    .map((attr: any) => {
      const name =
        typeof attr.attribute === 'object'
          ? attr.attribute?.label || attr.attribute?.name || attr.attribute?.title
          : attr.attribute
      const value =
        typeof attr.value === 'object'
          ? attr.value?.label || attr.value?.name || attr.value?.value
          : attr.value
      return name ? `${name} : ${value}` : String(value ?? '')
    })
    .filter(Boolean)
    .join(' · ')
}

/** Barre de progression vers la livraison offerte. */
export function FreeDeliveryProgress({
  subtotal,
  locale,
  currency = 'DT',
  className,
}: {
  subtotal: number
  locale: string
  currency?: string
  className?: string
}) {
  const copy = getCartCopy(locale)
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal)
  const reached = remaining <= 0
  const percent = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))

  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-[13px] text-foreground">
        <Truck
          className={cn('h-4 w-4 shrink-0', reached ? 'text-brand-green' : 'text-brand-pink')}
          strokeWidth={ICON_STROKE}
          aria-hidden
        />
        {reached ? copy.freeDelivery : copy.remaining(formatAmount(remaining, currency))}
      </p>
      <div
        className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out',
            reached ? 'bg-brand-green' : 'bg-primary',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/** Stepper de quantité en pilule, partagé par le tiroir et la page panier. */
export function QuantityStepper({
  item,
  locale,
  size = 'sm',
}: {
  item: CartItem
  locale: string
  size?: 'sm' | 'md'
}) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const copy = getCartCopy(locale)
  const btn = cn(
    'inline-flex items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30',
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
  )
  return (
    <div className="inline-flex items-center rounded-full border border-foreground/15">
      <button
        type="button"
        disabled={item.quantity <= 1}
        onClick={() => updateQuantity(item.id, item.quantity - 1)}
        className={btn}
        aria-label={copy.decrease}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
      </button>
      <span className={cn('text-center text-sm tabular-nums', size === 'sm' ? 'w-6' : 'w-8')}>
        {item.quantity}
      </span>
      <button
        type="button"
        disabled={item.quantity >= (item.stock || 99)}
        onClick={() => updateQuantity(item.id, item.quantity + 1)}
        className={btn}
        aria-label={copy.increase}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
      </button>
    </div>
  )
}

type CartDrawerProps = {
  open: boolean
  onClose: () => void
}

/**
 * Panier latéral (slide-over) depuis le côté de fin : droite en LTR, gauche en RTL.
 * Toujours monté pour animer l'ouverture et la fermeture ; `inert` quand fermé.
 */
export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { locale, t } = useLocale()
  const copy = getCartCopy(locale)
  const currency = t?.currency || 'DT'
  const closeRef = useRef<HTMLButtonElement>(null)
  // Le panier vient du localStorage : rien à rendre côté serveur (évite un écart d'hydratation).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearExpressCheckout = useCartStore((s) => s.clearExpressCheckout)
  // Même compte que la pastille du header (getTotalItemsCount = nombre de lignes).
  const totalItemsCount = items.length
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // Échap ferme le tiroir.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Verrouille le défilement de la page et place le focus dans le tiroir.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const id = window.setTimeout(() => closeRef.current?.focus(), 50)
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(id)
    }
  }, [open])

  const goToCheckout = () => {
    // Quitte le mode « achat express » pour que /commande reprenne le panier,
    // puis navigation complète pour que la page relise le cookie du panier.
    clearExpressCheckout()
    onClose()
    window.location.assign(`/${locale}/commande`)
  }

  if (!mounted) return null

  return (
    <div
      className={cn('fixed inset-0 z-[100]', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop — un clic à l'extérieur ferme */}
      <div
        className={cn(
          'absolute inset-0 bg-foreground/20 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={copy.cart}
        className={cn(
          'absolute inset-y-0 end-0 flex w-full flex-col bg-background shadow-[0_8px_30px_rgba(38,35,43,0.06)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:w-[420px]',
          open ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full',
        )}
      >
        {/* En-tête */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5 md:h-20 md:px-6">
          <h2 className="font-heading text-xl font-normal text-foreground">
            {copy.cart}{' '}
            <span className="text-muted-foreground">({totalItemsCount})</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-me-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={copy.close}
          >
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-mist">
              <ShoppingBag className="h-7 w-7 text-brand-pink" strokeWidth={ICON_STROKE} />
            </div>
            <h3 className="font-heading text-2xl font-normal text-foreground">{copy.emptyTitle}</h3>
            <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">{copy.emptyText}</p>
            <Link
              href={`/${locale}/boutique`}
              onClick={onClose}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm text-primary-foreground no-underline transition-opacity hover:opacity-90"
            >
              {copy.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <FreeDeliveryProgress
              subtotal={subtotal}
              locale={locale}
              currency={currency}
              className="shrink-0 border-b border-border px-5 py-4 md:px-6"
            />

            <ul className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain px-5 md:px-6">
              {items.map((item) => {
                const attributes = formatAttributes(item)
                const hasDiscount = Number(item.oldPrice) > Number(item.price)
                return (
                  <li key={item.id} className="flex gap-4 py-5">
                    <Link
                      href={`/${locale}/produit/${item.slug}`}
                      onClick={onClose}
                      className="relative h-[100px] w-20 shrink-0 overflow-hidden rounded-xl bg-brand-mist"
                    >
                      {item.image ? (
                        <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground/50" strokeWidth={ICON_STROKE} />
                        </span>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/${locale}/produit/${item.slug}`}
                          onClick={onClose}
                          className="line-clamp-2 min-w-0 text-sm text-foreground no-underline transition-colors hover:text-brand-pink"
                        >
                          {item.title}
                        </Link>
                        <div className="shrink-0 text-end">
                          <p className="text-sm font-medium text-foreground">
                            {formatAmount(item.price * item.quantity, currency)}
                          </p>
                          {hasDiscount && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatAmount(Number(item.oldPrice) * item.quantity, currency)}
                            </p>
                          )}
                        </div>
                      </div>

                      {attributes && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{attributes}</p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <QuantityStepper item={item} locale={locale} />
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                        >
                          {copy.remove}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Pied collant */}
            <div className="shrink-0 border-t border-border bg-background px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-foreground">{copy.subtotal}</span>
                <span className="font-heading text-xl font-normal text-foreground">
                  {formatAmount(subtotal, currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{copy.note}</p>
              <button
                type="button"
                onClick={goToCheckout}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              >
                {copy.checkout}
              </button>
              <Link
                href={`/${locale}/panier`}
                onClick={onClose}
                className="mt-3 block text-center text-sm text-foreground underline underline-offset-4 transition-colors hover:text-brand-pink"
              >
                {copy.viewCart}
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
