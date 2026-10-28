/**
 * Répare les stocks : recalcule `totalStock` et supprime les variants orphelins.
 *
 * À lancer une fois après le déploiement des correctifs, pour rattraper les
 * produits dont le stock total avait été écrasé par l'autosave du formulaire,
 * et les variants restés en base après la suppression de leur produit.
 *
 *   npx tsx src/scripts/resyncStock.ts          # simulation, n'écrit rien
 *   npx tsx src/scripts/resyncStock.ts --apply  # applique les corrections
 */

import { getPayload } from 'payload'
import config from '@payload-config'

const APPLY = process.argv.includes('--apply')

async function main() {
  const payload = await getPayload({ config })

  const [products, variants] = await Promise.all([
    payload.find({
      collection: 'products',
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'variants',
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])

  const variantsByProduct = new Map<string, any[]>()
  for (const variant of variants.docs as any[]) {
    const productId = String(
      variant.product && typeof variant.product === 'object' ? variant.product.id : variant.product,
    )
    if (!variantsByProduct.has(productId)) variantsByProduct.set(productId, [])
    variantsByProduct.get(productId)!.push(variant)
  }

  const knownProductIds = new Set((products.docs as any[]).map((p) => String(p.id)))

  console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (no writes) — pass --apply to fix ===')

  // 1. totalStock désynchronisé
  let fixed = 0
  for (const product of products.docs as any[]) {
    const productVariants = variantsByProduct.get(String(product.id)) ?? []
    if (!productVariants.length) continue

    const sum = productVariants.reduce((total, variant) => {
      const stock = Number(variant?.stock)
      return total + (Number.isFinite(stock) ? stock : 0)
    }, 0)

    if (Number(product.totalStock) === sum) continue

    const title = String(product.productTitle?.fr ?? product.productTitle ?? product.id).slice(0, 44)
    console.log(`  totalStock  ${title.padEnd(46)} ${product.totalStock} -> ${sum}`)
    fixed += 1

    if (APPLY) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: { totalStock: sum } as any,
        depth: 0,
        overrideAccess: true,
        // La valeur est déjà calculée : inutile que le hook la recalcule.
        context: { skipVariantStockSync: true },
      })
    }
  }

  // 2. variants orphelins
  const orphans = (variants.docs as any[]).filter((variant) => {
    const productId = String(
      variant.product && typeof variant.product === 'object' ? variant.product.id : variant.product,
    )
    return !knownProductIds.has(productId)
  })

  for (const orphan of orphans) {
    console.log(`  orphan      ${String(orphan.sku ?? orphan.id).padEnd(46)} stock=${orphan.stock}`)
    if (APPLY) {
      await payload.delete({
        collection: 'variants',
        id: orphan.id,
        overrideAccess: true,
        context: { skipVariantStockSync: true },
      })
    }
  }

  console.log(
    `\n${APPLY ? 'Fixed' : 'Would fix'}: ${fixed} desynced product(s), ${orphans.length} orphan variant(s).`,
  )

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
