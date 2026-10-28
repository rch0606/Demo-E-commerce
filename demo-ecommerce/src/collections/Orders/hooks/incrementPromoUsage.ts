import type { CollectionAfterChangeHook } from 'payload'

/**
 * When an order is created with a promoCode, increment that promo's usageCount.
 * Runs with overrideAccess so it works for public (website) orders too.
 */
export const incrementPromoUsageOnOrderCreate: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc

  const code = typeof doc.promoCode === 'string' ? doc.promoCode.trim().toUpperCase() : ''
  if (!code) return doc

  try {
    const found = await req.payload.find({
      collection: 'promo-codes',
      where: { promoCode: { equals: code } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })

    const promo = found.docs[0]
    if (!promo) return doc

    const nextCount = (Number(promo.usageCount) || 0) + 1

    await req.payload.update({
      collection: 'promo-codes',
      id: promo.id,
      data: { usageCount: nextCount },
      overrideAccess: true,
      req,
    })
  } catch (error) {
    req.payload.logger.error({ msg: 'Failed to increment promo usage', err: error })
  }

  return doc
}
