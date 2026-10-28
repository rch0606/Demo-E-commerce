import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const MAX_REVIEWS_PER_DAY = 3
const LOCALES = ['fr', 'ar', 'en'] as const

const clean = (value: unknown, maxLength: number) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)

/** Empreinte de l'IP : on ne stocke jamais l'adresse elle-même. */
function hashIp(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  return createHash('sha256')
    .update(`${ip}:${process.env.PAYLOAD_SECRET || ''}`)
    .digest('hex')
    .slice(0, 32)
}

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status })

/**
 * Dépôt d'un avis par un visiteur. L'avis est créé « en attente » et n'apparaît
 * sur le site qu'après approbation dans l'admin.
 */
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return fail('invalid_body')
  }

  // Champ piège invisible pour les humains : un robot le remplit. On répond
  // « ok » sans rien enregistrer pour ne pas lui donner d'indice.
  if (clean(body?.website, 200)) return NextResponse.json({ ok: true })

  const productId = clean(body?.productId, 64)
  const rating = Number(body?.rating)
  const authorName = clean(body?.authorName, 60)
  const title = clean(body?.title, 120)
  const comment = String(body?.comment ?? '').trim().slice(0, 2000)
  const email = clean(body?.email, 120)
  const locale = LOCALES.includes(body?.locale) ? body.locale : 'fr'

  if (!productId) return fail('missing_product')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('invalid_rating')
  if (authorName.length < 2) return fail('invalid_name')
  if (comment.length < 10) return fail('comment_too_short')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('invalid_email')

  try {
    const payload = await getPayload({ config })

    const { docs: products } = await payload.find({
      collection: 'products',
      where: { and: [{ id: { equals: productId } }, { _status: { equals: 'published' } }] },
      limit: 1,
      depth: 0,
      select: { slug: true },
      overrideAccess: true,
    })
    if (!products.length) return fail('unknown_product', 404)

    const ipHash = hashIp(req)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { docs: recent } = await payload.find({
      collection: 'reviews',
      where: { and: [{ ipHash: { equals: ipHash } }, { createdAt: { greater_than: since } }] },
      limit: MAX_REVIEWS_PER_DAY,
      depth: 0,
      select: { product: true },
      overrideAccess: true,
    })

    if (recent.some((review) => String(review.product) === productId)) {
      return fail('already_reviewed', 429)
    }
    if (recent.length >= MAX_REVIEWS_PER_DAY) return fail('too_many_reviews', 429)

    await payload.create({
      collection: 'reviews',
      data: {
        product: productId,
        rating,
        authorName,
        title: title || undefined,
        comment,
        authorEmail: email || undefined,
        locale,
        status: 'pending',
        ipHash,
      },
      overrideAccess: true,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[submit-review]', error)
    return fail('server_error', 500)
  }
}
