import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'

type PageBody = {
  visitId?: string
  page?: string
  title?: string
  room?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PageBody

    const visitId = String(body?.visitId || '').trim()
    if (!visitId) {
      return NextResponse.json({ ok: false, error: 'visitId is required' }, { status: 400 })
    }

    const page = String(body?.page || '/').trim() || '/'
    const title = body?.title ? String(body.title).slice(0, 300) : ''
    const room = body?.room ? String(body.room).trim() : null
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
      // Visit not found — client should call /init first
      return NextResponse.json(
        { ok: false, error: 'visit_not_found', message: 'Call /api/analytics/init first' },
        { status: 404 },
      )
    }

    const doc = existing.docs[0] as any
    const pages: any[] = Array.isArray(doc.pages) ? [...doc.pages] : []
    const rooms: any[] = Array.isArray(doc.rooms) ? [...doc.rooms] : []

    const lastPage = pages[pages.length - 1]
    const isDuplicate =
      lastPage &&
      lastPage.path === page &&
      (lastPage.room || null) === (room || null)

    if (isDuplicate) {
      // Just bump lastSeenAt
      await payload.update({
        collection: 'visits',
        id: doc.id,
        data: { lastSeenAt: now },
        overrideAccess: true,
      })

      return NextResponse.json({
        ok: true,
        visitId,
        pageViews: pages.length,
        duplicated: true,
      })
    }

    pages.push({
      path: page,
      title,
      room: room || undefined,
      visitedAt: now,
    })

    if (room && !rooms.some((r: any) => r.roomId === room)) {
      rooms.push({ roomId: room })
    }

    const updated = await payload.update({
      collection: 'visits',
      id: doc.id,
      data: {
        pages,
        rooms,
        pageViews: pages.length,
        lastSeenAt: now,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      ok: true,
      visitId,
      pageViews: (updated as any).pageViews ?? pages.length,
      duplicated: false,
    })
  } catch (error) {
    console.error('[analytics/page]', error)
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
