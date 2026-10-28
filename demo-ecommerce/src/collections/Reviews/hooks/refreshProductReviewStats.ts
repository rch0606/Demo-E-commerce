import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import type { Review } from '@/payload-types'

import { refreshReviewStats } from '@/utilities/reviewStats'

const productIdOf = (product: Review['product'] | undefined | null) =>
  product && typeof product === 'object' ? product.id : product

/**
 * Recalcule la note moyenne du produit dès qu'un avis approuvé apparaît,
 * change ou disparaît (y compris quand l'avis est déplacé vers un autre produit).
 */
export const refreshProductReviewStats: CollectionAfterChangeHook<Review> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const productId = productIdOf(doc.product)
  const previousProductId = productIdOf(previousDoc?.product)

  const wasApproved = previousDoc?.status === 'approved'
  const isApproved = doc.status === 'approved'
  const ratingChanged = previousDoc?.rating !== doc.rating
  const productChanged = Boolean(previousProductId) && previousProductId !== productId

  if (!wasApproved && !isApproved) return doc
  if (wasApproved && isApproved && !ratingChanged && !productChanged) return doc

  try {
    if (productId) await refreshReviewStats(req.payload, productId, req)
    if (productChanged && previousProductId) await refreshReviewStats(req.payload, previousProductId, req)
  } catch (error) {
    req.payload.logger.error(`Review stats refresh failed (review ${doc.id}): ${String(error)}`)
  }

  return doc
}

export const refreshProductReviewStatsAfterDelete: CollectionAfterDeleteHook<Review> = async ({
  doc,
  req,
}) => {
  const productId = productIdOf(doc.product)
  if (doc.status !== 'approved' || !productId) return doc

  try {
    await refreshReviewStats(req.payload, productId, req)
  } catch (error) {
    req.payload.logger.error(`Review stats refresh failed (deleted review ${doc.id}): ${String(error)}`)
  }

  return doc
}
