/**
 * Promotions au niveau catégorie.
 *
 * Une promotion (collection `category-promos`) porte une réduction en
 * pourcentage appliquée automatiquement à tous les produits des catégories
 * qu'elle vise. Règles retenues :
 *  - la promo catégorie prime sur la promo propre du produit (son `oldPrice`
 *    est ignoré, le prix barré affiché devient le prix de base) ;
 *  - un produit rattaché à plusieurs catégories en promo prend le meilleur
 *    pourcentage ;
 *  - les dates de début et de fin sont optionnelles.
 */

export type PromoWindow = {
  active?: boolean | null
  percentage?: number | null
  startsAt?: string | null
  endsAt?: string | null
}

/** Nom du champ virtuel posé sur les produits par le hook afterRead. */
export const PROMO_FIELD = 'categoryPromoPercentage'

/** Une promo ne compte que si elle est active, chiffrée et dans sa fenêtre. */
export function isPromoActive(
  promo: PromoWindow | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!promo?.active) return false

  const percentage = Number(promo.percentage)
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage >= 100) return false

  if (promo.startsAt) {
    const startsAt = new Date(promo.startsAt)
    if (!Number.isNaN(startsAt.getTime()) && startsAt > now) return false
  }

  if (promo.endsAt) {
    const endsAt = new Date(promo.endsAt)
    if (!Number.isNaN(endsAt.getTime()) && endsAt < now) return false
  }

  return true
}

/** Pourcentage exposé sur un produit lu via l'API (champ virtuel). */
export function getProductPromoPercentage(product: unknown): number {
  const percentage = Number((product as any)?.[PROMO_FIELD])
  return Number.isFinite(percentage) && percentage > 0 ? percentage : 0
}

/** Prix remisé, arrondi au millime. */
export function applyPromoPercentage(basePrice: number, percentage: number): number {
  const base = Number(basePrice) || 0
  if (!percentage) return base
  return Math.round(base * (1 - percentage / 100) * 1000) / 1000
}

/**
 * Prix affiché pour un couple (prix de base, ancien prix du produit).
 * Sous promo catégorie, l'ancien prix affiché est le prix de base : c'est bien
 * la réduction catégorie que le client voit, pas celle du produit.
 */
export function getPromoPricing(
  basePrice: number,
  ownOldPrice: number | null | undefined,
  percentage: number,
): { price: number; oldPrice: number | null } {
  const base = Number(basePrice) || 0

  if (!percentage) {
    const oldPrice = Number(ownOldPrice)
    return { price: base, oldPrice: Number.isFinite(oldPrice) && oldPrice > 0 ? oldPrice : null }
  }

  return { price: applyPromoPercentage(base, percentage), oldPrice: base }
}
