/** Shared promo-code helpers (client + server) */

export type PromoDiscountType = 'percentage' | 'amount'

export interface PromoCodeDoc {
  id: string
  promoCode: string
  discountType: PromoDiscountType
  discountValue: number
  active?: boolean | null
  valid?: boolean | null
  startDate?: string | null
  endDate?: string | null
  usageCodeLimit?: number | null
  usageCount?: number | null
  minOrderValue?: number | null
  maxDiscount?: number | null
  /** Relationship: string ids or populated objects */
  products?: (string | { id: string })[] | null
}

export type PromoValidationError =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit'
  | 'min_order'
  | 'products'
  | 'invalid'

export interface PromoValidationResult {
  ok: boolean
  error?: PromoValidationError
  message?: string
  promo?: PromoCodeDoc
  discountAmount?: number
}

const ERROR_MESSAGES_FR: Record<PromoValidationError, string> = {
  not_found: 'Code promo invalide',
  inactive: "Ce code promo n'est plus actif",
  not_started: "Ce code promo n'est pas encore actif",
  expired: 'Ce code promo a expiré',
  usage_limit: "Ce code promo a atteint sa limite d'utilisation",
  min_order: 'Montant minimum de commande non atteint',
  products: 'Ce code promo ne s’applique pas aux produits sélectionnés',
  invalid: "Ce code promo n'est plus valide",
}

export function promoErrorMessage(
  code: PromoValidationError,
  extra?: { minOrderValue?: number },
): string {
  if (code === 'min_order' && extra?.minOrderValue != null) {
    return `Montant minimum de commande : ${extra.minOrderValue} DT`
  }
  return ERROR_MESSAGES_FR[code]
}

export function normalizePromoProductIds(
  products?: (string | { id: string })[] | null,
): string[] {
  if (!products?.length) return []
  return products
    .map((p) => (typeof p === 'string' ? p : p?.id))
    .filter(Boolean)
    .map(String)
}

/**
 * Pure validity check (dates, active, usage, min order, products).
 * Does not trust the stored `valid` flag alone.
 */
export function validatePromoCode(
  promo: PromoCodeDoc | null | undefined,
  options: {
    cartTotal: number
    productIds: string[]
    now?: Date
  },
): PromoValidationResult {
  if (!promo) {
    return { ok: false, error: 'not_found', message: promoErrorMessage('not_found') }
  }

  const now = options.now ?? new Date()

  if (promo.active === false) {
    return { ok: false, error: 'inactive', message: promoErrorMessage('inactive'), promo }
  }

  if (promo.startDate && new Date(promo.startDate) > now) {
    return { ok: false, error: 'not_started', message: promoErrorMessage('not_started'), promo }
  }

  if (promo.endDate && new Date(promo.endDate) < now) {
    return { ok: false, error: 'expired', message: promoErrorMessage('expired'), promo }
  }

  const usageCount = promo.usageCount ?? 0
  if (
    promo.usageCodeLimit != null &&
    promo.usageCodeLimit > 0 &&
    usageCount >= promo.usageCodeLimit
  ) {
    return { ok: false, error: 'usage_limit', message: promoErrorMessage('usage_limit'), promo }
  }

  const minOrder = promo.minOrderValue ?? 0
  if (minOrder > 0 && options.cartTotal < minOrder) {
    return {
      ok: false,
      error: 'min_order',
      message: promoErrorMessage('min_order', { minOrderValue: minOrder }),
      promo,
    }
  }

  const allowed = normalizePromoProductIds(promo.products)
  if (allowed.length > 0 && options.productIds.length > 0) {
    const hasApplicable = options.productIds.some((id) => allowed.includes(String(id)))
    if (!hasApplicable) {
      return { ok: false, error: 'products', message: promoErrorMessage('products'), promo }
    }
  }

  const discountAmount = calculatePromoDiscount(promo, {
    cartTotal: options.cartTotal,
    productIds: options.productIds,
    lineItems: undefined,
  })

  return { ok: true, promo, discountAmount }
}

export function calculatePromoDiscount(
  promo: PromoCodeDoc,
  options: {
    cartTotal: number
    productIds: string[]
    /** Optional per-line amounts for product-restricted promos */
    lineItems?: { productId: string; lineTotal: number }[]
  },
): number {
  const allowed = normalizePromoProductIds(promo.products)

  let base = options.cartTotal

  if (allowed.length > 0) {
    if (options.lineItems?.length) {
      base = options.lineItems
        .filter((li) => allowed.includes(String(li.productId)))
        .reduce((sum, li) => sum + li.lineTotal, 0)
    } else {
      // Without line breakdown we can only apply if at least one product matches;
      // base stays cartTotal (caller should have validated product applicability).
      base = options.cartTotal
    }
  }

  if (base <= 0) return 0

  let discount = 0
  if (promo.discountType === 'percentage') {
    discount = base * (Number(promo.discountValue) / 100)
    if (promo.maxDiscount != null && promo.maxDiscount > 0) {
      discount = Math.min(discount, Number(promo.maxDiscount))
    }
  } else {
    discount = Math.min(Number(promo.discountValue) || 0, base)
  }

  return Math.max(0, Math.round(discount * 100) / 100)
}
