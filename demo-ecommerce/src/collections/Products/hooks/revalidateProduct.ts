import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'
import type { Product } from '@/payload-types'

import { revalidateTag } from 'next/cache'

/**
 * Le sitemap produits est mis en cache : sans invalidation, son <lastmod>
 * restait figé et Google n'avait aucune raison de revenir sur une fiche dont le
 * prix, l'image ou le stock venait de changer.
 */
const revalidateProductsSitemap = (payload: { logger: { warn: (msg: string) => void } }) => {
  try {
    revalidateTag('products-sitemap', 'max')
  } catch (error) {
    // Hors requête Next (scripts, jobs) : le cache horaire du sitemap prendra le relais.
    payload.logger.warn(`products-sitemap revalidation skipped: ${String(error)}`)
  }
}

export const revalidateProduct: CollectionAfterChangeHook<Product> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) return doc

  // Un brouillon enregistré ne change rien côté site.
  if (doc._status === 'published' || previousDoc?._status === 'published') {
    revalidateProductsSitemap(payload)
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Product> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) revalidateProductsSitemap(payload)

  return doc
}
