import { NextRequest, NextResponse } from 'next/server'
import { appendEvents } from '@/utilities/recordStorage'

export const runtime = 'nodejs'

type Body = {
  roomId?: string
  host?: string
  visitId?: string
  events?: unknown[]
}

const MAX_EVENTS_PER_BATCH = 80

/**
 * POST /api/record/event
 * Body: { roomId, host?, visitId?, events: rrwebEvent[] }
 * Appends filtered events (gzip NDJSON) under uploads/record/{day}/..., kept 7 days.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body

    const roomId = String(body?.roomId || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 40)

    if (!roomId) {
      return NextResponse.json({ ok: false, error: 'roomId is required' }, { status: 400 })
    }

    const host = body?.host ? String(body.host).slice(0, 200) : null
    const visitId = body?.visitId ? String(body.visitId).slice(0, 80) : null
    const rawEvents = Array.isArray(body?.events) ? body.events : []

    if (!rawEvents.length) {
      return NextResponse.json({ ok: true, written: 0 })
    }

    const events = rawEvents.slice(0, MAX_EVENTS_PER_BATCH)
    const { written } = appendEvents(host, roomId, events, { visitId })

    return NextResponse.json({ ok: true, roomId, written })
  } catch (error) {
    console.error('[record/event]', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
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
