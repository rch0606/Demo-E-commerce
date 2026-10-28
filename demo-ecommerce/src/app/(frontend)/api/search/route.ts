import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { IN_STOCK_WHERE } from '@/lib/productVisibility'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q')
    const locale = searchParams.get('locale') || 'fr'
    const limit = parseInt(searchParams.get('limit') || '5')
    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const payload = await getPayload({ config: configPromise })

    // Une référence exacte (saisie ou collée depuis la fiche) passe en premier.
    const reference = query.replace(/\s+/g, '')

    const products = await payload.find({
      collection: 'products',
      // Droits d'un visiteur, comme la boutique : produits publiés uniquement.
      overrideAccess: false,
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 2,
      limit,
      where: {
        ...IN_STOCK_WHERE,
        or: [
          { productTitle: { like: query } },
          { subtitle: { like: query } },
          { description: { like: query } },
          { barcode: { like: reference } },
        ]
      },
      select: {
        id: true,
        productTitle: true,
        barcode: true,
        slug: true,
        currentPrice: true,
        oldPrice: true,
        // Nécessaire au hook de promotion : sans les catégories il ne peut pas
        // résoudre la réduction. Le champ virtuel, lui, est posé après le
        // filtrage de `select` et n'a pas à y figurer.
        categories: true,
        featuredImage: true,
        gallery: true,
        totalStock: true,
      }
    })
    const isExactReference = (doc: { barcode?: string | null }) =>
      (doc.barcode || '').replace(/\s+/g, '').toLowerCase() === reference.toLowerCase()

    const results = [...products.docs].sort(
      (a, b) => Number(isExactReference(b)) - Number(isExactReference(a)),
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ results: [], error: String(error) })
  }
}