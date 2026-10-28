import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { calculatePromoDiscount, PromoCodeDoc, validatePromoCode } from '@/utilities/promoCodes'


export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body?.code || '')
      .trim()
      .toUpperCase()
    const cartTotal = Number(body?.cartTotal) || 0
    const productIds: string[] = Array.isArray(body?.productIds)
      ? body.productIds.map(String)
      : []
    const lineItems = Array.isArray(body?.lineItems) ? body.lineItems : undefined

    if (!code) {
      return NextResponse.json(
        { ok: false, error: 'not_found', message: 'Veuillez entrer un code promo' },
        { status: 400 },
      )
    }

    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'promo-codes',
      where: {
        promoCode: {
          equals: code,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    const promo = (result.docs[0] as PromoCodeDoc | undefined) ?? null

    const validation = validatePromoCode(promo, { cartTotal, productIds })

    if (!validation.ok || !validation.promo) {
      return NextResponse.json(
        {
          ok: false,
          error: validation.error,
          message: validation.message,
        },
        { status: 200 },
      )
    }

    const discountAmount = calculatePromoDiscount(validation.promo, {
      cartTotal,
      productIds,
      lineItems,
    })

    return NextResponse.json({
      ok: true,
      promo: {
        id: validation.promo.id,
        promoCode: validation.promo.promoCode,
        discountType: validation.promo.discountType,
        discountValue: validation.promo.discountValue,
        maxDiscount: validation.promo.maxDiscount ?? null,
        minOrderValue: validation.promo.minOrderValue ?? 0,
        products: validation.promo.products ?? [],
        usageCount: validation.promo.usageCount ?? 0,
        usageCodeLimit: validation.promo.usageCodeLimit ?? null,
        startDate: validation.promo.startDate ?? null,
        endDate: validation.promo.endDate ?? null,
        active: validation.promo.active !== false,
      },
      discountAmount,
    })
  } catch (error) {
    console.error('[validate-promo]', error)
    return NextResponse.json(
      { ok: false, error: 'invalid', message: 'Erreur lors de la validation du code promo' },
      { status: 500 },
    )
  }
}
