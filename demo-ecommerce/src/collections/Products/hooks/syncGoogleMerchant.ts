import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Endpoint } from 'payload'
import type { Product } from '@/payload-types'

import {
  deleteMerchantProduct,
  describeMerchantError,
  isMerchantSyncEnabled,
  syncAllProductsToMerchant,
  syncProductToMerchant,
} from '@/utilities/googleMerchant'

/**
 * Envoie le produit à Google Merchant Center à chaque publication (y compris
 * les mises à jour de stock venant des variants), et le retire quand il est
 * dépublié. Une erreur Google ne doit jamais bloquer l'enregistrement.
 */
export const syncGoogleMerchant: CollectionAfterChangeHook<Product> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (!isMerchantSyncEnabled() || req.context?.skipMerchantSync) return doc

  const isPublished = doc._status === 'published'
  // Les brouillons en autosave d'un produit publié ne changent rien côté site.
  const isUnpublished =
    doc._status === 'draft' &&
    previousDoc?._status === 'published' &&
    req.query?.autosave !== 'true'

  if (!isPublished && !isUnpublished) return doc

  try {
    await syncProductToMerchant(req.payload, doc.id)
  } catch (error) {
    req.payload.logger.error(`Google Merchant sync failed (product ${doc.id}): ${describeMerchantError(error)}`)
  }

  return doc
}

export const deleteFromGoogleMerchant: CollectionAfterDeleteHook<Product> = async ({ doc, req }) => {
  try {
    await deleteMerchantProduct(doc)
  } catch (error) {
    req.payload.logger.error(`Google Merchant delete failed (product ${doc.id}): ${describeMerchantError(error)}`)
  }

  return doc
}

/** POST /api/products/merchant-sync : renvoie tout le catalogue publié. */
export const merchantSyncEndpoint: Endpoint = {
  path: '/merchant-sync',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMerchantSyncEnabled()) {
      return Response.json({ error: 'Google Merchant sync is not configured' }, { status: 400 })
    }

    const result = await syncAllProductsToMerchant(req.payload)
    return Response.json(result)
  },
}
