import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

async function recalculateProductTotalStock(
  productId: string | number,
  payload: any,
) {
  if (!productId) return

  const variantsResult = await payload.find({
    collection: 'variants',
    where: {
      product: {
        equals: productId,
      },
    },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })

  const totalStock = variantsResult.docs.reduce((sum: number, variant: any) => {
    const stock = Number(variant.stock)
    return sum + (Number.isFinite(stock) ? stock : 0)
  }, 0)

  await payload.update({
    collection: 'products',
    id: productId,
    data: {
      totalStock,
    } as any,
    depth: 0,
    overrideAccess: true,
    context: {
      skipVariantStockSync: true,
    },
  })
}

export const syncProductStockFromVariants: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const productId =
    typeof doc.product === 'object' ? doc.product?.id : doc.product

  if (!productId) {
    return doc
  }

  try {
    await recalculateProductTotalStock(productId, req.payload)
  } catch (error) {
    console.error('syncProductStockFromVariants error:', error)
  }

  return doc
}

export const syncProductStockAfterVariantDelete: CollectionAfterDeleteHook =
  async ({ doc, req }) => {
    const productId =
      typeof doc?.product === 'object' ? doc.product?.id : doc?.product

    if (!productId) {
      return doc
    }

    try {
      await recalculateProductTotalStock(productId, req.payload)
    } catch (error) {
      console.error('syncProductStockAfterVariantDelete error:', error)
    }

    return doc
  }
