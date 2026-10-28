import type { CollectionBeforeChangeHook } from 'payload'
import type { Product } from '@/payload-types'

import { computeReviewStats } from '@/utilities/reviewStats'

/**
 * La note moyenne vient de la collection « Avis ». On la recalcule à chaque
 * enregistrement pour qu'un brouillon ancien, une fois publié, ne remette pas
 * des valeurs périmées.
 */
export const deriveReviewStats: CollectionBeforeChangeHook<Product> = async ({
  data,
  originalDoc,
  req,
}) => {
  const productId = originalDoc?.id
  if (!productId) return { ...data, averageRating: 0, reviewCount: 0 }

  try {
    return { ...data, ...(await computeReviewStats(req.payload, productId, req)) }
  } catch (error) {
    req.payload.logger.error(`Review stats derivation failed (product ${productId}): ${String(error)}`)
    return data
  }
}
