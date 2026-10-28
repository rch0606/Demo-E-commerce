'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Gift,
  X,
  Check,
  ChevronDown,
  Truck,
  Lock,
  Banknote,
  AlertCircle,
} from 'lucide-react'
import { useLocale } from '@/lib/locale-context'
import { useCartStore } from '@/stores/cart'
import { trackBeginCheckout } from '@/lib/analytics'

/** Read analytics cookies set by AnalyticsTracker */
function getAnalyticsIds(): { visitId?: string; visitorId?: string } {
  if (typeof document === 'undefined') return {}
  try {
    const parts = document.cookie.split(/;\s*/)
    let visitId: string | undefined
    let visitorId: string | undefined
    for (const part of parts) {
      const eq = part.indexOf('=')
      if (eq === -1) continue
      const key = part.slice(0, eq).trim()
      const val = decodeURIComponent(part.slice(eq + 1) || '').trim()
      if (key === '_tid' && val) visitId = val
      if (key === '_vid' && val) visitorId = val
    }
    return { visitId, visitorId }
  } catch {
    return {}
  }
}

interface CustomerForm {
  name: string
  phone: string
  email: string
  address: string
  government: string
  birthDate: string
  childrenBirthDates: string[]
}

const INITIAL_FORM: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  government: '',
  birthDate: '',
  childrenBirthDates: [],
}

const TUNISIAN_GOVERNORATES = [
  'Ariana',
  'Béja',
  'Ben Arous',
  'Bizerte',
  'Gabès',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kébili',
  'Kef',
  'Mahdia',
  'Manouba',
  'Médenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan',
]

const isValidEmail = (email: string) =>
  !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

const COPY = {
  fr: {
    contact: 'Contact',
    delivery: 'Livraison',
    payment: 'Paiement',
    email: 'E-mail',
    optional: 'facultatif',
    emailHint: 'Pour recevoir la confirmation de commande.',
    governorate: 'Gouvernorat',
    selectGovernorate: 'Sélectionnez un gouvernorat',
    deliveryNote: 'Livraison à domicile en 24-48h partout en Tunisie.',
    cod: 'Paiement à la livraison',
    codDesc:
      'Vous réglez en espèces au livreur à la réception de votre colis. Aucun paiement en ligne.',
    birthday: 'Votre date de naissance',
    birthdayHint: 'Une attention le jour de votre anniversaire.',
    confirm: 'Confirmer la commande',
    reassurance:
      'Notre équipe vous appelle pour confirmer la commande avant l’expédition.',
    errName: 'Indiquez votre nom.',
    errPhone: 'Indiquez un numéro de téléphone.',
    errEmail: 'Adresse e-mail invalide.',
    errAddress: 'Indiquez votre adresse de livraison.',
    errGovernorate: 'Choisissez un gouvernorat.',
    removeDate: 'Supprimer',
  },
  en: {
    contact: 'Contact',
    delivery: 'Delivery',
    payment: 'Payment',
    email: 'Email',
    optional: 'optional',
    emailHint: 'To receive your order confirmation.',
    governorate: 'Governorate',
    selectGovernorate: 'Select a governorate',
    deliveryNote: 'Home delivery within 24-48h anywhere in Tunisia.',
    cod: 'Cash on delivery',
    codDesc:
      'Pay the courier in cash when your parcel arrives. No online payment.',
    birthday: 'Your date of birth',
    birthdayHint: 'A little something on your birthday.',
    confirm: 'Confirm order',
    reassurance: 'Our team will call you to confirm the order before shipping.',
    errName: 'Please enter your name.',
    errPhone: 'Please enter a phone number.',
    errEmail: 'Invalid email address.',
    errAddress: 'Please enter your delivery address.',
    errGovernorate: 'Please choose a governorate.',
    removeDate: 'Remove',
  },
  ar: {
    contact: 'معلومات الاتصال',
    delivery: 'التوصيل',
    payment: 'الدفع',
    email: 'البريد الإلكتروني',
    optional: 'اختياري',
    emailHint: 'لاستلام تأكيد الطلب.',
    governorate: 'الولاية',
    selectGovernorate: 'اختر الولاية',
    deliveryNote: 'توصيل إلى المنزل خلال 24-48 ساعة في كامل تونس.',
    cod: 'الدفع عند الاستلام',
    codDesc: 'تدفع نقداً لعامل التوصيل عند استلام طردك. لا يوجد دفع عبر الإنترنت.',
    birthday: 'تاريخ ميلادك',
    birthdayHint: 'مفاجأة صغيرة في يوم عيد ميلادك.',
    confirm: 'تأكيد الطلب',
    reassurance: 'سيتصل بك فريقنا لتأكيد الطلب قبل الشحن.',
    errName: 'يرجى إدخال اسمك.',
    errPhone: 'يرجى إدخال رقم الهاتف.',
    errEmail: 'بريد إلكتروني غير صالح.',
    errAddress: 'يرجى إدخال عنوان التوصيل.',
    errGovernorate: 'يرجى اختيار الولاية.',
    removeDate: 'إزالة',
  },
} as const

const inputBase =
  'h-12 w-full rounded-full border bg-card px-5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-0 disabled:opacity-60'

const inputState = (invalid: boolean) =>
  invalid
    ? 'border-destructive focus:border-destructive'
    : 'border-input focus:border-foreground/40'

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      className="mt-1.5 flex items-center gap-1.5 ps-5 text-xs text-destructive"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      {message}
    </p>
  )
}

function SectionTitle({ index, title }: { index: number; title: string }) {
  return (
    <h2 className="mb-5 flex items-baseline gap-3 font-heading text-xl font-normal text-foreground">
      <span className="text-base text-brand-pink">{index}.</span>
      {title}
    </h2>
  )
}

interface OrderFormProps {
  /** SSR snapshot from cookies — avoids hydration mismatch with Zustand */
  initialItems?: any[]
  /** Promo applied in OrderContent (under product cards) */
  appliedPromoCode?: string | null
  promoDiscount?: number
  /** Réglage boutique, résolu côté serveur par la page /commande */
  deliveryFee?: number
}

export function OrderForm({
  initialItems = [],
  appliedPromoCode = null,
  promoDiscount = 0,
  deliveryFee = 0,
}: OrderFormProps) {
  const { t, locale } = useLocale()
  const router = useRouter()
  const {
    items,
    clearCart,
    getTotalPrice,
    getTotalItems,
    expressItem,
    hydrateExpressCheckout,
    clearExpressCheckout,
  } = useCartStore()

  const [form, setForm] = useState<CustomerForm>(INITIAL_FORM)
  const [error, setError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const orderSubmittedRef = useRef(false)

  const beginCheckoutTracked = useRef(false)

  useEffect(() => {
    hydrateExpressCheckout()
    setIsMounted(true)
  }, [hydrateExpressCheckout])

  // Track begin_checkout once when the commande form is shown with items
  useEffect(() => {
    if (!isMounted || beginCheckoutTracked.current) return
    const state = useCartStore.getState()
    const lines = state.expressItem
      ? [state.expressItem]
      : state.items?.length
        ? state.items
        : initialItems || []
    if (!lines.length) return
    beginCheckoutTracked.current = true

    const value = state.expressItem
      ? (Number(state.expressItem.price) || 0) * (Number(state.expressItem.quantity) || 1)
      : state.getTotalPrice?.() ?? 0
    const itemCount = state.expressItem
      ? Number(state.expressItem.quantity) || 1
      : state.getTotalItems?.() ?? lines.length

    const productIds = lines
      .map((l: any) => (l?.productId != null ? String(l.productId) : null))
      .filter(Boolean) as string[]
    const productNames = lines
      .map((l: any) => (l?.title != null ? String(l.title).trim() : null))
      .filter(Boolean) as string[]

    trackBeginCheckout({
      productId: productIds[0],
      name: productNames[0],
      productIds,
      productNames,
      value,
      quantity: lines.length === 1 && lines[0]?.quantity != null
        ? Number(lines[0].quantity)
        : undefined,
      itemCount,
    })
  }, [isMounted, initialItems?.length])


  // Leave commande without ordering → drop express mode (panier stays intact)
  useEffect(() => {
    return () => {
      if (!orderSubmittedRef.current && useCartStore.getState().expressItem) {
        useCartStore.getState().clearExpressCheckout()
      }
    }
  }, [])

  const isExpress = isMounted && !!expressItem

  // Prefer express item; otherwise use hydrated cart, fallback to SSR cookie snapshot
  // (Zustand persist may still be empty right after isMounted flips true)
  const cartItems = isExpress
    ? [expressItem!]
    : items.length > 0
      ? items
      : initialItems

  const subtotal = isExpress
    ? (expressItem!.price || 0) * (expressItem!.quantity || 1)
    : items.length > 0
      ? getTotalPrice()
      : initialItems.reduce(
          (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
          0,
        )

  // La remise porte sur les articles, jamais sur la livraison : un code promo
  // de 100 % ne doit pas offrir le transport.
  const discountedItems = Math.max(0, subtotal - promoDiscount)
  const totalPrice = discountedItems + deliveryFee

  const totalItems = isExpress
    ? expressItem!.quantity || 1
    : items.length > 0
      ? getTotalItems()
      : initialItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)

  const updateForm =
    (field: keyof CustomerForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
    }

  const removeChildDate = (index: number) => {
    setForm((f) => ({
      ...f,
      childrenBirthDates: f.childrenBirthDates.filter((_, i) => i !== index),
    }))
  }

  const updateChildDate = (index: number, value: string) => {
    setForm((f) => ({
      ...f,
      childrenBirthDates: f.childrenBirthDates.map((date, i) =>
        i === index ? value : date,
      ),
    }))
  }

  const formatPriceLocal = (price: number) => {
    return new Intl.NumberFormat(
      locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-FR',
      {
        style: 'currency',
        currency: 'TND',
      },
    ).format(price)
  }

  const validateBirthDate = (date: string) => {
    if (!date) return true
    const selected = new Date(date)
    const today = new Date()
    selected.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    return selected <= today
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(false)
    setSubmitError(null)

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.government.trim() ||
      // The form uses noValidate (inline error messages), so keep the
      // format check the native type="email" used to provide.
      !isValidEmail(form.email)
    ) {
      setError(true)
      return
    }

    if (!cartItems || cartItems.length === 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const notes = cartItems
        .map((item: any) => {
          const attrs =
            item.selectedAttributes && item.selectedAttributes.length > 0
              ? ` (${item.selectedAttributes.map((a: any) => `${a.attribute}: ${a.value}`).join(', ')})`
              : ''
          return `- ${item.title}${attrs} x${item.quantity} : ${formatPriceLocal(item.price * item.quantity)}`
        })
        .join('\n')

      const structuredItems = cartItems.map((item: any) => {
        const attrs =
          item.selectedAttributes && item.selectedAttributes.length > 0
            ? item.selectedAttributes
                .map((a: any) => `${a.attribute}: ${a.value}`)
                .join(', ')
            : ''
        const price = Number(item.price) || 0
        const oldPrice = Number(item.oldPrice) || 0

        return {
          productId: item.productId || '',
          variantId: item.variantId || '',
          title: item.title || '',
          attributes: attrs,
          quantity: item.quantity || 1,
          price,
          // Uniquement s'il y a vraiment eu remise : un « prix initial » égal
          // au prix payé n'apprend rien et polluerait la fiche commande.
          oldPrice: oldPrice > price ? oldPrice : undefined,
          subtotal: price * (item.quantity || 1),
        }
      })

      const allBirthDates = [form.birthDate, ...form.childrenBirthDates].filter(
        Boolean,
      )

      if (allBirthDates.some((date) => !validateBirthDate(date))) {
        setSubmitError(
          locale === 'fr'
            ? 'La date de naissance ne peut pas être dans le futur.'
            : 'Birth date cannot be in the future.',
        )
        setIsSubmitting(false)
        return
      }

      const allDates = [form.birthDate, ...form.childrenBirthDates].filter(
        (date) => date.trim() !== '',
      )

      const { visitId, visitorId } = getAnalyticsIds()

      const orderData = {
        product: cartItems.map((item: any) => item.productId),
        items: structuredItems,
        quantity: totalItems,
        deliveryFee,
        totalAmount: totalPrice,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email?.trim() || undefined,
        customerAddress: form.address,
        customerGouvernorat: form.government,
        promoCode: appliedPromoCode || null,
        customerChildrenBirthDates:
          allDates.length > 0 ? allDates.map((date) => ({ date })) : null,
        status: 'new',
        source: 'website',
        note: notes,
        // Link order → visit session (Visits collection)
        ...(visitId ? { visitId } : {}),
        ...(visitorId ? { visitorId } : {}),
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg =
          data.errors?.[0]?.message ||
          data.message ||
          'Erreur lors de la commande'
        throw new Error(errorMsg)
      }

      const orderNumber = data.orderNumber || data.doc?.orderNumber || ''
      const orderId = data.id || data.doc?.id || ''

      // Save order summary for success page (product info) before clearing cart
      try {
        sessionStorage.setItem(
          'order-success-summary',
          JSON.stringify({
            orderNumber,
            orderId,
            total: totalPrice,
            name: form.name,
            phone: form.phone,
            items: cartItems.map((item: any) => ({
              productId: item.productId,
              title: item.title,
              quantity: item.quantity,
              price: item.price,
              image: item.image || null,
              selectedAttributes: item.selectedAttributes || [],
            })),
          }),
        )
        sessionStorage.setItem('order-just-submitted', '1')
      } catch {
        /* ignore */
      }

      orderSubmittedRef.current = true

      // Clear cart / express only after flag is set (avoids empty-cart flash)
      if (expressItem) {
        clearExpressCheckout()
      } else {
        clearCart()
      }

      const params = new URLSearchParams()
      if (orderNumber) params.set('order', orderNumber)
      if (orderId) params.set('id', orderId)
      params.set('total', totalPrice.toString())
      params.set('name', form.name)
      params.set('phone', form.phone)
      const productIds = cartItems
        .map((item: any) => item.productId)
        .filter(Boolean)
      if (productIds.length > 0) {
        params.set('ids', productIds.join(','))
      }

      router.push(`/${locale}/commande/success?${params.toString()}`)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Une erreur est survenue',
      )
      setIsSubmitting(false)
    }
  }

  const c = COPY[locale as keyof typeof COPY] || COPY.fr

  // Per-field errors, shown once the user has tried to submit
  const fieldErrors = {
    name: error && !form.name.trim() ? c.errName : null,
    phone: error && !form.phone.trim() ? c.errPhone : null,
    email: error && !isValidEmail(form.email) ? c.errEmail : null,
    address: error && !form.address.trim() ? c.errAddress : null,
    government: error && !form.government.trim() ? c.errGovernorate : null,
  }

  const labelClass = 'mb-1.5 block ps-1 text-[13px] text-muted-foreground'

  const today = new Date()
  const maxDate = today.toISOString().split('T')[0]
  const minDate = new Date(
    today.getFullYear() - 12,
    today.getMonth(),
    today.getDate(),
  )
    .toISOString()
    .split('T')[0]

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-10">
      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          {submitError}
        </div>
      )}

      {/* 1. Contact */}
      <section>
        <SectionTitle index={1} title={c.contact} />
        <div className="grid gap-4">
          <div>
            <label htmlFor="name" className={labelClass}>
              {t.customerName}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t.customerNamePlaceholder}
              value={form.name}
              onChange={updateForm('name')}
              className={`${inputBase} ${inputState(!!fieldErrors.name)}`}
              disabled={isSubmitting}
              required
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
            />
            {fieldErrors.name && <FieldError id="name-error" message={fieldErrors.name} />}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className={labelClass}>
                {t.phone}
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder={t.phonePlaceholder}
                value={form.phone}
                onChange={updateForm('phone')}
                className={`${inputBase} ${inputState(!!fieldErrors.phone)}`}
                disabled={isSubmitting}
                required
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
              />
              {fieldErrors.phone && (
                <FieldError id="phone-error" message={fieldErrors.phone} />
              )}
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                {c.email}{' '}
                <span className="text-muted-foreground/70">({c.optional})</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="votre@email.com"
                value={form.email}
                onChange={updateForm('email')}
                className={`${inputBase} ${inputState(!!fieldErrors.email)}`}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : 'email-hint'}
              />
              {fieldErrors.email ? (
                <FieldError id="email-error" message={fieldErrors.email} />
              ) : (
                <p id="email-hint" className="mt-1.5 ps-5 text-xs text-muted-foreground">
                  {c.emailHint}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Livraison */}
      <section>
        <SectionTitle index={2} title={c.delivery} />
        <div className="grid gap-4">
          <div>
            <label htmlFor="address" className={labelClass}>
              {t.address}
            </label>
            <textarea
              id="address"
              autoComplete="street-address"
              placeholder={t.addressPlaceholder}
              rows={2}
              value={form.address}
              onChange={updateForm('address')}
              className={`w-full resize-none rounded-xl border bg-card px-5 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:ring-0 disabled:opacity-60 ${inputState(!!fieldErrors.address)}`}
              disabled={isSubmitting}
              required
              aria-invalid={!!fieldErrors.address}
              aria-describedby={fieldErrors.address ? 'address-error' : undefined}
            />
            {fieldErrors.address && (
              <FieldError id="address-error" message={fieldErrors.address} />
            )}
          </div>

          <div>
            <label htmlFor="government" className={labelClass}>
              {c.governorate}
            </label>
            <div className="relative">
              <select
                id="government"
                value={form.government}
                onChange={updateForm('government')}
                className={`${inputBase} ${inputState(!!fieldErrors.government)} cursor-pointer appearance-none pe-12 ${form.government ? '' : 'text-muted-foreground'}`}
                disabled={isSubmitting}
                required
                aria-invalid={!!fieldErrors.government}
                aria-describedby={
                  fieldErrors.government ? 'government-error' : undefined
                }
              >
                <option value="">{c.selectGovernorate}</option>
                {TUNISIAN_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov} className="text-foreground">
                    {gov}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.5}
              />
            </div>
            {fieldErrors.government && (
              <FieldError id="government-error" message={fieldErrors.government} />
            )}
          </div>

          <p className="flex items-center gap-2 ps-1 text-[13px] text-muted-foreground">
            <Truck className="h-4 w-4 shrink-0 text-brand-pink" strokeWidth={1.5} />
            {c.deliveryNote}
          </p>
        </div>
      </section>

      {/* 3. Paiement */}
      <section>
        <SectionTitle index={3} title={c.payment} />
        <div
          role="radiogroup"
          aria-label={c.payment}
          className="overflow-hidden rounded-2xl border border-foreground/40 bg-card"
        >
          <div
            role="radio"
            aria-checked="true"
            className="flex items-start gap-4 p-5"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3 w-3" strokeWidth={2.5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{c.cod}</p>
                <Banknote
                  className="h-5 w-5 shrink-0 text-brand-pink"
                  strokeWidth={1.5}
                />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {c.codDesc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Optional birthday — discreet row */}
      <div className="border-t border-foreground/10 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="birthDate" className="flex items-start gap-3">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand-pink" strokeWidth={1.5} />
            <span>
              <span className="block text-sm text-foreground">
                {c.birthday}{' '}
                <span className="text-xs text-muted-foreground">({c.optional})</span>
              </span>
              <span className="block text-xs text-muted-foreground">
                {c.birthdayHint}
              </span>
            </span>
          </label>
          <input
            id="birthDate"
            type="date"
            value={form.birthDate}
            onChange={updateForm('birthDate')}
            min={minDate}
            max={maxDate}
            className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-foreground/40 focus:ring-0 sm:w-48"
            disabled={isSubmitting}
          />
        </div>

        {form.childrenBirthDates.map((date, index) => (
          <div key={index} className="mt-2 flex items-center justify-end gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => updateChildDate(index, e.target.value)}
              min={minDate}
              max={maxDate}
              className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground outline-none transition-colors focus:border-foreground/40 focus:ring-0 sm:w-48"
              disabled={isSubmitting}
              aria-label={
                locale === 'fr'
                  ? `Date de naissance de l'enfant ${index + 2}`
                  : locale === 'ar'
                    ? `تاريخ ميلاد الطفل ${index + 2}`
                    : `Child ${index + 2} date of birth`
              }
            />
            <button
              type="button"
              onClick={() => removeChildDate(index)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              aria-label={c.removeDate}
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div>
        {error && (
          <p role="alert" className="mb-3 text-center text-sm text-destructive">
            {t.requiredFields}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
              {t.submitting}
            </>
          ) : (
            <>
              {c.confirm}
              <span aria-hidden="true" className="opacity-60">
                ·
              </span>
              <span>{formatPriceLocal(totalPrice)}</span>
            </>
          )}
        </button>
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {c.reassurance}
        </p>
      </div>
    </form>
  )
}
