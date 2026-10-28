'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react'
import { CMSLink } from '@/components/Link'
import { ProductCard } from '@/components/ProductCard'
import { SectionHeading } from '@/components/SectionHeading'
import type { Product } from '@/payload-types'
import { trackPurchase } from '@/lib/metaPixel'
import { trackPurchase as trackAnalyticsPurchase } from '@/lib/analytics'


type SummaryItem = {
  productId?: string
  title: string
  quantity: number
  price: number
  image?: string | null
  selectedAttributes?: { attribute: string; value: string }[]
}

type OrderSummary = {
  orderNumber?: string
  orderId?: string
  total: number
  name: string
  phone: string
  items: SummaryItem[]
}

export default function OrderSuccessClient({
  relatedProducts,
  locale,
}: {
  relatedProducts: Product[]
  locale: string
}) {
  const searchParams = useSearchParams()
  const [summary, setSummary] = useState<OrderSummary | null>(null)

  const totalParam = searchParams.get('total') || '0'
  const nameParam = searchParams.get('name') || ''
  const phoneParam = searchParams.get('phone') || ''
  const orderParam = searchParams.get('order') || ''

  const purchaseTracked = useRef(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('order-success-summary')
      if (raw) {
        const parsed = JSON.parse(raw) as OrderSummary
        setSummary(parsed)

        // Meta Pixel Purchase — once per success page load
        if (!purchaseTracked.current && parsed.items?.length) {
          purchaseTracked.current = true
          const contentIds = parsed.items
            .map((i) => i.productId)
            .filter(Boolean) as string[]
          const numItems = parsed.items.reduce(
            (sum, i) => sum + (Number(i.quantity) || 0),
            0,
          )
          trackPurchase({
            contentIds: contentIds.length ? contentIds : ['unknown'],
            value: Number(parsed.total) || 0,
            currency: 'TND',
            numItems,
            contents: parsed.items
              .filter((i) => i.productId)
              .map((i) => ({
                id: String(i.productId),
                quantity: Number(i.quantity) || 1,
                item_price: Number(i.price) || 0,
              })),
          })

          const firstItem = parsed.items.find((i) => i.productId) || parsed.items[0]
          const productNames = parsed.items
            .map((i) => (i?.title != null ? String(i.title).trim() : ''))
            .filter(Boolean)
          trackAnalyticsPurchase({
            orderId: parsed.orderId,
            orderNumber: parsed.orderNumber,
            value: Number(parsed.total) || 0,
            itemCount: numItems,
            productId: firstItem?.productId
              ? String(firstItem.productId)
              : undefined,
            name: firstItem?.title ? String(firstItem.title) : undefined,
            productIds: contentIds,
            productNames,
          })
        }

      }
      sessionStorage.removeItem('order-just-submitted')
    } catch {
      /* ignore */
    }
  }, [])

  const name = summary?.name || nameParam
  const phone = summary?.phone || phoneParam
  const total = summary?.total != null ? String(summary.total) : totalParam
  const orderNumber = summary?.orderNumber || orderParam
  const items = summary?.items || []


  const intlLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR'

  const formatPrice = (price: string | number) => {
    const amount = typeof price === 'number' ? price : parseFloat(price) || 0
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'TND',
    }).format(amount)
  }

  const formatAmount = (price: string | number) => {
    const amount = typeof price === 'number' ? price : parseFloat(price) || 0
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount)
  }

  const copy = {
    fr: {
      eyebrow: 'Commande reçue',
      title: 'Merci, votre commande est confirmée',
      orderNo: 'Commande',
      text: (p: string) =>
        p
          ? `Notre équipe vous appellera au ${p} dans les plus brefs délais pour confirmer la livraison.`
          : 'Notre équipe vous appellera dans les plus brefs délais pour confirmer la livraison.',
      customer: 'Vos informations',
      name: 'Nom',
      phone: 'Téléphone',
      deliveryPayment: 'Livraison & paiement',
      delivery: 'Livraison',
      deliveryValue: 'À domicile, sous 24-48h',
      payment: 'Paiement',
      paymentValue: 'À la livraison, en espèces',
      items: 'Articles commandés',
      article: (n: number) => `${n} article${n > 1 ? 's' : ''}`,
      qty: 'Qté',
      pending: 'Les détails de la commande seront bientôt disponibles.',
      subtotal: 'Sous-total',
      total: 'Total',
      totalNote: 'Livraison et remises incluses',
      continue: 'Continuer mes achats',
      home: "Retour à l'accueil",
      relatedBadge: 'Suggestions',
      relatedTitle: 'Vous aimerez aussi',
      relatedSubtitle: 'Complétez votre shopping avec ces pièces.',
      seeAll: 'Voir toute la boutique',
    },
    en: {
      eyebrow: 'Order received',
      title: 'Thank you, your order is confirmed',
      orderNo: 'Order',
      text: (p: string) =>
        p
          ? `Our team will call you at ${p} shortly to confirm delivery.`
          : 'Our team will call you shortly to confirm delivery.',
      customer: 'Your details',
      name: 'Name',
      phone: 'Phone',
      deliveryPayment: 'Delivery & payment',
      delivery: 'Delivery',
      deliveryValue: 'Home delivery, 24-48h',
      payment: 'Payment',
      paymentValue: 'Cash on delivery',
      items: 'Items ordered',
      article: (n: number) => `${n} item${n > 1 ? 's' : ''}`,
      qty: 'Qty',
      pending: 'Order details will be available shortly.',
      subtotal: 'Subtotal',
      total: 'Total',
      totalNote: 'Delivery and discounts included',
      continue: 'Continue shopping',
      home: 'Back to home',
      relatedBadge: 'Suggestions',
      relatedTitle: 'You may also like',
      relatedSubtitle: 'Complete your order with these pieces.',
      seeAll: 'View the whole shop',
    },
    ar: {
      eyebrow: 'تم استلام الطلب',
      title: 'شكراً، تم تأكيد طلبك',
      orderNo: 'الطلب',
      text: (p: string) =>
        p
          ? `سيتصل بك فريقنا على الرقم ${p} في أقرب وقت لتأكيد التوصيل.`
          : 'سيتصل بك فريقنا في أقرب وقت لتأكيد التوصيل.',
      customer: 'معلوماتك',
      name: 'الاسم',
      phone: 'الهاتف',
      deliveryPayment: 'التوصيل والدفع',
      delivery: 'التوصيل',
      deliveryValue: 'إلى المنزل خلال 24-48 ساعة',
      payment: 'الدفع',
      paymentValue: 'نقداً عند الاستلام',
      items: 'المنتجات المطلوبة',
      article: (n: number) => `${n} منتج`,
      qty: 'الكمية',
      pending: 'ستتوفر تفاصيل الطلب قريباً.',
      subtotal: 'المجموع الفرعي',
      total: 'المجموع',
      totalNote: 'شامل التوصيل والتخفيضات',
      continue: 'مواصلة التسوق',
      home: 'العودة إلى الرئيسية',
      relatedBadge: 'اقتراحات',
      relatedTitle: 'قد يعجبك أيضاً',
      relatedSubtitle: 'أكمل تسوقك بهذه المنتجات.',
      seeAll: 'عرض كل المتجر',
    },
  }
  const t = copy[locale as keyof typeof copy] || copy.fr

  const itemsSubtotal = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0,
  )
  const itemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline justify-between gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end font-medium text-foreground">{value}</dd>
    </div>
  )

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 md:pt-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-mist">
              <Check className="h-9 w-9 text-brand-pink" strokeWidth={1.5} />
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 max-w-xl font-heading text-3xl font-normal leading-tight text-foreground md:text-[2.75rem]">
              {t.title}
            </h1>
            {orderNumber && (
              <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-1.5 text-sm">
                <span className="text-muted-foreground">{t.orderNo}</span>
                <span className="font-medium text-foreground" dir="ltr">
                  #{orderNumber}
                </span>
              </span>
            )}
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
              {t.text(phone)}
            </p>
          </div>

          {/* Info card */}
          <div className="mt-12 grid overflow-hidden rounded-3xl border border-border md:grid-cols-2">
            <div className="p-6 md:p-8">
              <h2 className="font-heading text-lg font-normal text-foreground">
                {t.customer}
              </h2>
              <dl className="mt-3 divide-y divide-border">
                <Row label={t.name} value={name || '—'} />
                <Row label={t.phone} value={<span dir="ltr">{phone || '—'}</span>} />
              </dl>
            </div>
            <div className="border-t border-border p-6 md:border-s md:border-t-0 md:p-8">
              <h2 className="font-heading text-lg font-normal text-foreground">
                {t.deliveryPayment}
              </h2>
              <dl className="mt-3 divide-y divide-border">
                <Row label={t.delivery} value={t.deliveryValue} />
                <Row label={t.payment} value={t.paymentValue} />
              </dl>
            </div>
          </div>

          {/* Items */}
          <div className="mt-10">
            <div className="flex items-baseline justify-between gap-3 border-b border-border pb-4">
              <h2 className="font-heading text-xl font-normal text-foreground">
                {t.items}
              </h2>
              {itemCount > 0 && (
                <span className="text-sm text-muted-foreground">{t.article(itemCount)}</span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingBag
                  className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-muted-foreground">{t.pending}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item, index) => (
                  <li key={index} className="flex items-center gap-4 py-4">
                    <div className="relative shrink-0">
                      <div className="h-16 w-16 overflow-hidden rounded-xl bg-brand-mist">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ShoppingBag
                              className="h-5 w-5 text-muted-foreground/60"
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
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      {item.selectedAttributes && item.selectedAttributes.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.selectedAttributes
                            .map((a) => `${a.attribute} : ${a.value}`)
                            .join(' · ')}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.qty} {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-foreground">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* Totals */}
            <div className="border-t border-border pt-4">
              {items.length > 0 && (
                <div className="flex justify-between gap-4 py-1 text-sm">
                  <span className="text-muted-foreground">{t.subtotal}</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(itemsSubtotal)}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="font-heading text-lg font-normal text-foreground">
                    {t.total}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.totalNote}</p>
                </div>
                <p className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">TND</span>
                  <span className="font-heading text-3xl font-normal text-foreground">
                    {formatAmount(total)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <CMSLink
              url="/boutique"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
              {t.continue}
            </CMSLink>
            <CMSLink
              url="/"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-foreground/15 bg-transparent px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
              {t.home}
            </CMSLink>
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 border-t border-border pt-14 md:mt-24">
            <SectionHeading
              badge={t.relatedBadge}
              title={t.relatedTitle}
              subtitle={t.relatedSubtitle}
              action={
                <CMSLink
                  url="/boutique"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-pink underline-offset-4 hover:underline"
                >
                  {t.seeAll}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.5} />
                </CMSLink>
              }
            />
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
