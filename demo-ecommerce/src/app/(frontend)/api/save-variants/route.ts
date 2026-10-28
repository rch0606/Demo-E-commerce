import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Enregistrement en une passe des variants d'un produit.
 *
 * L'ancien parcours supprimait tous les variants puis les recréait un par un
 * depuis le navigateur : le stock déjà saisi était perdu, chaque création
 * relançait le recalcul du produit (cent variants = cent écritures et cent
 * versions), et une interruption laissait le produit sans variants.
 *
 * Ici on rapproche l'existant par combinaison : ce qui existe est mis à jour
 * (le SKU est conservé), ce qui manque est créé, ce qui n'a plus lieu d'être
 * est supprimé — et le stock total n'est recalculé qu'une seule fois à la fin.
 */

/** Deux variants sont « le même » s'ils portent la même combinaison de valeurs. */
const signature = (combination: unknown): string =>
  Array.isArray(combination)
    ? combination
        .map((value) => String(value && typeof value === 'object' ? (value as any).id : value))
        .sort()
        .join('|')
    : ''

/** Même règle que le champ « Référence » des variants : sans espaces, vide = aucune. */
const normalizeReference = (value: unknown): string | null => {
  const reference = String(value ?? '').replace(/\s+/g, '')
  return reference || null
}

const isValidReference = (reference: string) =>
  /^[0-9A-Za-z-]+$/.test(reference) && reference.length >= 8 && reference.length <= 32

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Cette route écrit en base : réservée aux utilisateurs authentifiés.
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json({ message: 'Missing product id' }, { status: 400 })
    }

    const { variants } = await req.json()

    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ message: 'No variants provided' }, { status: 400 })
    }

    // Références : contrôlées avant toute écriture, pour ne jamais laisser un
    // enregistrement à moitié fait sur un doublon.
    const references = variants.map((variant: any) => normalizeReference(variant.reference))
    const filled = references.filter((reference): reference is string => Boolean(reference))

    const invalid = filled.filter((reference) => !isValidReference(reference))
    if (invalid.length) {
      return NextResponse.json(
        {
          message: `Référence invalide : ${invalid.join(', ')} (8 à 32 caractères : lettres, chiffres, tirets).`,
        },
        { status: 400 },
      )
    }

    const repeated = filled.filter((reference, index) => filled.indexOf(reference) !== index)
    if (repeated.length) {
      return NextResponse.json(
        { message: `Référence en double dans le tableau : ${[...new Set(repeated)].join(', ')}.` },
        { status: 400 },
      )
    }

    if (filled.length) {
      const taken = await payload.find({
        collection: 'variants',
        where: { and: [{ reference: { in: filled } }, { product: { not_equals: productId } }] },
        depth: 0,
        limit: filled.length,
        overrideAccess: true,
        select: { reference: true, sku: true },
      })
      if (taken.docs.length) {
        const list = taken.docs.map((doc) => `${doc.reference} (${doc.sku})`).join(', ')
        return NextResponse.json(
          { message: `Référence déjà utilisée par un autre produit : ${list}.` },
          { status: 400 },
        )
      }
    }

    const existing = await payload.find({
      collection: 'variants',
      where: { product: { equals: productId } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    })

    // Le recalcul du stock produit est différé : une seule fois, à la fin.
    const context = { skipVariantStockSync: true }

    const wanted = new Set(variants.map((variant: any) => signature(variant.combination)))
    const keepBySignature = new Map<string, any>()
    const toDelete: any[] = []

    for (const doc of existing.docs) {
      const key = signature(doc.combination)

      if (!wanted.has(key)) {
        // Combinaison retirée du produit.
        toDelete.push(doc)
      } else if (keepBySignature.has(key)) {
        // Doublon historique sur la même combinaison : on n'en garde qu'un.
        toDelete.push(doc)
      } else {
        keepBySignature.set(key, doc)
      }
    }

    // Référence visée pour chaque combinaison.
    const referenceBySignature = new Map<string, string | null>(
      variants.map((variant: any, index: number) => [signature(variant.combination), references[index]]),
    )

    // Une référence peut passer d'une taille à l'autre : on libère d'abord celles
    // qui changent (ou dont le variant va disparaître), sinon l'unicité
    // bloquerait l'échange.
    for (const doc of existing.docs as any[]) {
      if (!doc.reference) continue
      const key = signature(doc.combination)
      const kept = keepBySignature.get(key)?.id === doc.id
      const target = kept ? referenceBySignature.get(key) : null
      if (target !== doc.reference) {
        await payload.update({
          collection: 'variants',
          id: doc.id,
          data: { reference: null },
          overrideAccess: true,
          context,
        })
      }
    }

    let created = 0
    let updated = 0

    for (const incoming of variants) {
      const key = signature(incoming.combination)
      const match = keepBySignature.get(key)

      const stock = Math.max(0, Math.floor(Number(incoming.stock) || 0))
      const price = Math.max(0, Number(incoming.price) || 0)
      const reference = normalizeReference(incoming.reference)

      if (match) {
        await payload.update({
          collection: 'variants',
          id: match.id,
          data: { stock, price, reference },
          overrideAccess: true,
          context,
        })
        updated += 1
      } else {
        await payload.create({
          collection: 'variants',
          data: {
            product: productId,
            attributes: incoming.attributes,
            combination: incoming.combination,
            price,
            stock,
            reference,
          },
          overrideAccess: true,
          context,
        })
        created += 1
      }
    }

    for (const doc of toDelete) {
      await payload.delete({
        collection: 'variants',
        id: doc.id,
        overrideAccess: true,
        context,
      })
    }

    // Recalcul unique du stock total, à partir de l'état réellement en base.
    const finalVariants = await payload.find({
      collection: 'variants',
      where: { product: { equals: productId } },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
    })

    const totalStock = finalVariants.docs.reduce((sum: number, variant: any) => {
      const value = Number(variant?.stock)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)

    await payload.update({
      collection: 'products',
      id: productId,
      data: { totalStock } as any,
      depth: 0,
      overrideAccess: true,
      context,
    })

    return NextResponse.json({
      created,
      updated,
      deleted: toDelete.length,
      totalStock,
    })
  } catch (err) {
    console.error('save-variants error:', err)

    return NextResponse.json({ message: 'Failed to save variants' }, { status: 500 })
  }
}
