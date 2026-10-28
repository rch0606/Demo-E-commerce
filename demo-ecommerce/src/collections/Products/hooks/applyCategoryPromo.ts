import type { CollectionAfterReadHook, PayloadRequest } from 'payload'

import { PROMO_FIELD, isPromoActive } from '@/lib/categoryPromo'

/** Une promotion en cours, réduite aux identifiants utiles au calcul. */
type ActivePromo = {
  percentage: number
  categories: Set<string>
  excludedProducts: Set<string>
  /** Produits créés après cette date exclus ; null = tous les produits. */
  productsCreatedBefore: number | null
}

/**
 * Date de création d'un produit. `createdAt` peut manquer quand la requête
 * utilise `select` : on se rabat alors sur l'ObjectId MongoDB, dont les
 * 8 premiers caractères hexadécimaux sont l'horodatage de création.
 */
const getCreatedAt = (doc: any): number | null => {
  const createdAt = doc?.createdAt ? new Date(doc.createdAt).getTime() : NaN
  if (Number.isFinite(createdAt)) return createdAt

  const id = toId(doc?.id)
  if (id && /^[0-9a-f]{24}$/i.test(id)) return parseInt(id.slice(0, 8), 16) * 1000

  return null
}

/** Une relation lue en depth 0 est un id, en depth supérieur un document. */
const toId = (value: unknown): string | null => {
  const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : value
  return id == null ? null : String(id)
}

const toIds = (values: unknown): string[] =>
  Array.isArray(values) ? (values.map(toId).filter(Boolean) as string[]) : []

/**
 * Les promotions en cours sont chargées une seule fois par requête et mémorisées
 * sur `req.context` : un produit lu avec depth 0 ne référence ses catégories que
 * par id, et une page boutique lit des dizaines de produits.
 */
async function getActivePromos(req: PayloadRequest): Promise<ActivePromo[]> {
  const context = (req.context ?? {}) as { categoryPromos?: ActivePromo[] }
  if (context.categoryPromos) return context.categoryPromos

  let promos: ActivePromo[] = []

  try {
    const { docs } = await req.payload.find({
      collection: 'category-promos',
      where: { active: { equals: true } },
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      req,
    })

    promos = docs
      .filter((promo: any) => isPromoActive(promo))
      .map((promo: any) => ({
        percentage: Number(promo.percentage),
        categories: new Set(toIds(promo.categories)),
        excludedProducts: new Set(toIds(promo.excludedProducts)),
        productsCreatedBefore: promo.productsCreatedBefore
          ? new Date(promo.productsCreatedBefore).getTime() || null
          : null,
      }))
  } catch {
    // Une promotion illisible ne doit jamais empêcher l'affichage d'un produit.
  }

  if (req.context) req.context.categoryPromos = promos

  return promos
}

/**
 * Expose sur chaque produit le meilleur pourcentage de réduction porté par ses
 * catégories, hors promotions qui l'excluent nommément. Champ virtuel : rien
 * n'est écrit en base, les prix stockés restent les prix de référence.
 */
export const applyCategoryPromo: CollectionAfterReadHook = async ({ doc, req }) => {
  if (!doc) return doc

  const categories = toIds(doc.categories)
  if (!categories.length) {
    doc[PROMO_FIELD] = null
    return doc
  }

  const promos = await getActivePromos(req)
  if (!promos.length) {
    doc[PROMO_FIELD] = null
    return doc
  }

  const productId = toId(doc.id)
  const createdAt = getCreatedAt(doc)

  const percentage = promos.reduce<number>((best, promo) => {
    if (promo.percentage <= best) return best
    if (productId && promo.excludedProducts.has(productId)) return best
    if (promo.productsCreatedBefore && createdAt && createdAt >= promo.productsCreatedBefore) {
      return best
    }
    if (!categories.some((id) => promo.categories.has(id))) return best

    return promo.percentage
  }, 0)

  doc[PROMO_FIELD] = percentage > 0 ? percentage : null

  return doc
}
