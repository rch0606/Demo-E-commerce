import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import type { Review } from '@/payload-types'

import { describeMerchantError } from '@/utilities/googleMerchant'
import {
  deleteMerchantReview,
  isMerchantReviewsSyncEnabled,
  upsertMerchantReview,
} from '@/utilities/googleMerchantReviews'

/**
 * Un avis approuvé est envoyé à Google ; s'il repasse en attente ou est refusé,
 * il est retiré. Une erreur Google ne doit jamais bloquer la modération.
 */
export const syncReviewToMerchant: CollectionAfterChangeHook<Review> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (!isMerchantReviewsSyncEnabled()) return doc

  const isApproved = doc.status === 'approved'
  const wasApproved = previousDoc?.status === 'approved'
  if (!isApproved && !wasApproved) return doc

  try {
    if (isApproved) await upsertMerchantReview(req.payload, doc)
    else await deleteMerchantReview(doc.id)
  } catch (error) {
    req.payload.logger.error(`Google Merchant review sync failed (review ${doc.id}): ${describeMerchantError(error)}`)
  }

  return doc
}

export const deleteReviewFromMerchant: CollectionAfterDeleteHook<Review> = async ({ doc, req }) => {
  if (!isMerchantReviewsSyncEnabled() || doc.status !== 'approved') return doc

  try {
    await deleteMerchantReview(doc.id)
  } catch (error) {
    req.payload.logger.error(`Google Merchant review delete failed (review ${doc.id}): ${describeMerchantError(error)}`)
  }

  return doc
}
