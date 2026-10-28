import type { CollectionAfterChangeHook } from 'payload'
import type { Review } from '@/payload-types'

/** Prévient les modérateurs (notification dans l'admin) qu'un avis attend validation. */
export const notifyNewReview: CollectionAfterChangeHook<Review> = async ({ doc, operation, req }) => {
  if (operation !== 'create' || doc.status !== 'pending') return doc

  const { payload } = req

  try {
    const { docs: moderators } = await payload.find({
      collection: 'users',
      where: { role: { in: ['owner', 'admin', 'seo'] } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const productId = typeof doc.product === 'object' ? doc.product?.id : doc.product
    const product = productId
      ? await payload
          .findByID({ collection: 'products', id: productId, depth: 0, overrideAccess: true, req })
          .catch(() => null)
      : null

    for (const user of moderators) {
      await payload.create({
        collection: 'notifications',
        data: {
          type: 'new_review',
          title: `Nouvel avis ${'★'.repeat(doc.rating)} – ${doc.authorName}`,
          message: product?.productTitle ? `Sur « ${product.productTitle} » – à valider` : 'À valider',
          review: doc.id,
          user: user.id,
          read: false,
        },
        overrideAccess: true,
        req,
      })
    }
  } catch (error) {
    payload.logger.error(`New review notification failed (review ${doc.id}): ${String(error)}`)
  }

  return doc
}
