import type { CollectionAfterDeleteHook } from 'payload'

/**
 * Supprimer un produit doit emporter ses variants.
 *
 * Sans cela les variants restent en base, rattachés à un produit disparu :
 * ils continuent de compter dans les statistiques de stock et faussent les
 * inventaires, sans qu'aucun écran ne les montre.
 */
export const deleteProductVariants: CollectionAfterDeleteHook = async ({ id, req }) => {
  if (!id) return

  try {
    await req.payload.delete({
      collection: 'variants',
      where: { product: { equals: id } },
      overrideAccess: true,
      // Le produit n'existe plus : inutile de recalculer son stock.
      context: { skipVariantStockSync: true },
      req,
    })
  } catch (error) {
    console.error('deleteProductVariants error:', error)
  }
}
