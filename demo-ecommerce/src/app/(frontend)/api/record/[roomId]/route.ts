import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { readRoomEvents } from '@/utilities/recordStorage'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId: raw } = await ctx.params
    const roomId = String(raw || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 40)

    if (!roomId) {
      return NextResponse.json({ ok: false, error: 'roomId is required' }, { status: 400 })
    }

    // Auth: only owner/admin can replay
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    const role = (user as any)?.role
    if (!user || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const data = readRoomEvents(roomId)

    return NextResponse.json({
      ok: true,
      roomId: data.roomId,
      host: data.host,
      month: data.month,
      total: data.events.length,
      events: data.events,
    })
  } catch (error) {
    console.error('[record/get]', error)
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
