import type { CollectionBeforeChangeHook } from 'payload'

/**
 * `totalStock` est une valeur dérivée : la somme du stock des variants.
 *
 * Elle était jusqu'ici un champ ordinaire du formulaire, donc l'autosave du
 * panneau d'administration réécrivait la valeur calculée par le hook des
 * variants — d'où des produits bloqués sur la valeur par défaut alors que
 * leurs variants totalisaient dix fois plus. On recalcule ici à chaque
 * écriture : le formulaire ne décide plus jamais du stock.
 *
 * Un produit sans variant conserve la valeur saisie : c'est alors la seule
 * source d'information disponible.
 */
export const deriveTotalStock: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  // Le hook des variants vient déjà d'écrire la somme : ne pas la recalculer.
  if (req.context?.skipVariantStockSync) return data

  const productId = originalDoc?.id
  if (!productId) return data

  try {
    const { docs } = await req.payload.find({
      collection: 'variants',
      where: { product: { equals: productId } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })

    if (!docs.length) return data

    data.totalStock = docs.reduce((sum: number, variant: any) => {
      const stock = Number(variant?.stock)
      return sum + (Number.isFinite(stock) ? stock : 0)
    }, 0)
  } catch (error) {
    // Un recalcul impossible ne doit pas empêcher l'enregistrement du produit.
    console.error('deriveTotalStock error:', error)
  }

  return data
}
