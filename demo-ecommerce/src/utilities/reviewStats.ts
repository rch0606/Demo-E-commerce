import type { Payload, PayloadRequest } from 'payload'

export type ReviewStats = { averageRating: number; reviewCount: number }

/** Note moyenne (arrondie à 0,1) et nombre d'avis approuvés d'un produit. */
export async function computeReviewStats(
  payload: Payload,
  productId: string | number,
  req?: PayloadRequest,
): Promise<ReviewStats> {
  const { docs } = await payload.find({
    collection: 'reviews',
    where: {
      and: [{ product: { equals: productId } }, { status: { equals: 'approved' } }],
    },
    pagination: false,
    depth: 0,
    select: { rating: true },
    overrideAccess: true,
    req,
  })

  const ratings = docs.map((doc) => Number(doc.rating)).filter((rating) => rating >= 1 && rating <= 5)
  if (!ratings.length) return { averageRating: 0, reviewCount: 0 }

  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  return { averageRating: Math.round(average * 10) / 10, reviewCount: ratings.length }
}

/**
 * Écrit les stats directement sur le document produit publié, sans passer par
 * `payload.update` : celui-ci créerait une version et publierait au passage un
 * éventuel brouillon en cours. Le hook `deriveReviewStats` des produits
 * recalcule ces valeurs à chaque enregistrement, donc une publication
 * ultérieure ne peut pas les écraser avec d'anciennes valeurs.
 */
export async function refreshReviewStats(
  payload: Payload,
  productId: string | number,
  req?: PayloadRequest,
) {
  const stats = await computeReviewStats(payload, productId, req)

  await payload.db.updateOne({
    collection: 'products',
    where: { id: { equals: productId } },
    data: stats,
    req,
  })

  return stats
}
