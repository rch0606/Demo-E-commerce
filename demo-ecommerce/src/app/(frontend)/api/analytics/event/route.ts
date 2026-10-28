import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'

type EventBody = {
  visitId?: string
  type?: string
  path?: string
  roomId?: string | null
  meta?: Record<string, unknown> | null
}

const MAX_EVENTS_PER_VISIT = 200
const MAX_TYPE_LEN = 80
const MAX_PATH_LEN = 500

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EventBody

    const visitId = String(body?.visitId || '').trim()
    if (!visitId) {
      return NextResponse.json({ ok: false, error: 'visitId is required' }, { status: 400 })
    }

    const type = String(body?.type || '')
      .trim()
      .toLowerCase()
      .slice(0, MAX_TYPE_LEN)

    if (!type) {
      return NextResponse.json({ ok: false, error: 'type is required' }, { status: 400 })
    }

    const path = body?.path
      ? String(body.path).trim().slice(0, MAX_PATH_LEN)
      : undefined

    const roomId = body?.roomId
      ? String(body.roomId)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 40)
      : undefined

    // Extract known fields from meta → simple readable fields (no JSON blob)
    let meta: Record<string, unknown> = {}
    if (body?.meta && typeof body.meta === 'object' && !Array.isArray(body.meta)) {
      try {
        meta = JSON.parse(JSON.stringify(body.meta)) as Record<string, unknown>
      } catch {
        meta = {}
      }
    }

    const now = new Date().toISOString()
    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'visits',
      where: { visitId: { equals: visitId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (!existing.docs.length) {
      return NextResponse.json(
        { ok: false, error: 'visit_not_found', message: 'Call /api/analytics/init first' },
        { status: 404 },
      )
    }

    const doc = existing.docs[0] as any
    const events: any[] = Array.isArray(doc.events) ? [...doc.events] : []

    // Flatten meta into named fields so admin shows clear values, not JSON
    // productId: direct field, or first entry of productIds[]
    let productId: string | undefined
    if (meta.productId != null) {
      productId = String(meta.productId)
    } else if (Array.isArray(meta.productIds) && meta.productIds.length > 0) {
      productId = String(meta.productIds[0])
    }

    // productName: prefer full list (productNames[] / names[]) so multi-item
    // events like begin_checkout show every product, not only the first.
    let productName: string | undefined
    if (Array.isArray(meta.productNames) && meta.productNames.length > 0) {
      productName = meta.productNames
        .map((n) => String(n || '').trim())
        .filter(Boolean)
        .join(', ')
    } else if (Array.isArray(meta.names) && meta.names.length > 0) {
      productName = meta.names
        .map((n) => String(n || '').trim())
        .filter(Boolean)
        .join(', ')
    } else if (meta.name != null) {
      productName = String(meta.name)
    } else if (meta.productName != null) {
      productName = String(meta.productName)
    }
    const value = typeof meta.value === 'number' ? meta.value : undefined
    // quantity from quantity, or fall back to itemCount for cart-level events
    const quantity =
      typeof meta.quantity === 'number'
        ? meta.quantity
        : typeof meta.itemCount === 'number'
          ? meta.itemCount
          : undefined
    const orderId = meta.orderId != null ? String(meta.orderId) : undefined
    const orderNumber =
      meta.orderNumber != null ? String(meta.orderNumber) : undefined
    const itemCount =
      typeof meta.itemCount === 'number' ? meta.itemCount : undefined
    const promoCode =
      meta.code != null
        ? String(meta.code)
        : meta.promoCode != null
          ? String(meta.promoCode)
          : undefined
    const discountAmount =
      typeof meta.discountAmount === 'number' ? meta.discountAmount : undefined

    events.push({
      type,
      path: path || undefined,
      roomId: roomId || undefined,
      at: now,
      productId,
      productName,
      value,
      quantity,
      orderId,
      orderNumber,
      itemCount,
      promoCode,
      discountAmount,
    })

    // Cap array size to avoid huge documents
    const trimmed = events.length > MAX_EVENTS_PER_VISIT
      ? events.slice(events.length - MAX_EVENTS_PER_VISIT)
      : events

    await payload.update({
      collection: 'visits',
      id: doc.id,
      data: {
        events: trimmed,
        lastSeenAt: now,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      ok: true,
      visitId,
      type,
      eventsCount: trimmed.length,
    })
  } catch (error) {
    console.error('[analytics/event]', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
