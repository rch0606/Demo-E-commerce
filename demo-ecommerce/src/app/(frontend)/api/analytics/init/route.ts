import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseUserAgent } from '@/utilities/parseUserAgent'
import { getLocationFromIp } from '@/utilities/ipGeolocation'

export const runtime = 'nodejs'

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }
  return req.headers.get('x-real-ip') || null
}

type InitBody = {
  visitId?: string
  visitorId?: string | null
  source?: string
  gclid?: string | null
  fbclid?: string | null
  msclkid?: string | null
  ttclid?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  host?: string
  referrer?: string | null
  userAgent?: string | null
  page?: string
  title?: string
  room?: string | null
}

type VisitSource = 'organic' | 'ads' | 'social' | 'referral' | 'direct'

const ALLOWED_SOURCES = new Set<VisitSource>([
  'organic',
  'ads',
  'social',
  'referral',
  'direct',
])

/** Unknown / missing → direct (never inflate SEO) */
function normalizeSource(value: unknown): VisitSource {
  const s = String(value || '').trim()
  return ALLOWED_SOURCES.has(s as VisitSource) ? (s as VisitSource) : 'direct'
}

/** Prefer stronger attribution when a returning session gets new campaign signals */
function mergeSource(
  existing: VisitSource | string | null | undefined,
  incoming: VisitSource,
): VisitSource {
  const cur = normalizeSource(existing)
  if (incoming === 'ads') return 'ads'
  if (incoming === 'social' && cur !== 'ads') return 'social'
  if (incoming === 'organic' && (cur === 'direct' || cur === 'referral')) return 'organic'
  if (incoming === 'referral' && cur === 'direct') return 'referral'
  return cur
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InitBody

    const visitId = String(body?.visitId || '').trim()
    if (!visitId) {
      return NextResponse.json({ ok: false, error: 'visitId is required' }, { status: 400 })
    }

    const visitorId = body?.visitorId ? String(body.visitorId).trim() : null
    const source: VisitSource = normalizeSource(body?.source)

    const page = String(body?.page || '/').trim() || '/'
    const title = body?.title ? String(body.title).slice(0, 300) : ''
    const room = body?.room ? String(body.room).trim() : null
    const host = body?.host ? String(body.host).slice(0, 200) : null
    const referrer = body?.referrer ? String(body.referrer).slice(0, 1000) : null
    const userAgentRaw = body?.userAgent
      ? String(body.userAgent).slice(0, 500)
      : req.headers.get('user-agent')?.slice(0, 500) || null

    const ua = parseUserAgent(userAgentRaw)
    const ip = getClientIp(req)
    const now = new Date().toISOString()
    const geo = await getLocationFromIp(ip)
    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'visits',
      where: { visitId: { equals: visitId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    // ── Update existing session (same _tid within ~30 min) ──────────────────
    if (existing.docs.length > 0) {
      const doc = existing.docs[0] as any
      const pages: any[] = Array.isArray(doc.pages) ? [...doc.pages] : []
      const rooms: any[] = Array.isArray(doc.rooms) ? [...doc.rooms] : []

      const lastPage = pages[pages.length - 1]
      const isSamePageAndRoom =
        lastPage &&
        lastPage.path === page &&
        (lastPage.room || null) === (room || null)

      if (!isSamePageAndRoom) {
        pages.push({
          path: page,
          title,
          room: room || undefined,
          visitedAt: now,
        })
      }

      if (room && !rooms.some((r: any) => r.roomId === room)) {
        rooms.push({ roomId: room })
      }

      const nextSource = mergeSource(doc.source, source)
      const hasNewAdsSignal = Boolean(
        (body.fbclid && !doc.fbclid) ||
          (body.gclid && !doc.gclid) ||
          (body.msclkid && !doc.msclkid) ||
          (body.ttclid && !doc.ttclid),
      )

      const updated = await payload.update({
        collection: 'visits',
        id: doc.id,
        data: {
          lastSeenAt: now,
          pageViews: pages.length,
          pages,
          rooms,
          ...(visitorId && !doc.visitorId ? { visitorId } : {}),
          ...(nextSource !== doc.source || hasNewAdsSignal
            ? { source: hasNewAdsSignal ? 'ads' : nextSource }
            : {}),
          ...(host && !doc.host ? { host } : {}),
          ...(ip && !doc.ip ? { ip } : {}),
          ...(referrer && !doc.referrer ? { referrer } : {}),
          ...(geo && !doc.location?.countryCode ? { location: geo } : {}),
          ...((!doc.browser && ua.browser) || (!doc.os && ua.os)
            ? {
                browser: ua.browser || undefined,
                browserVersion: ua.browserVersion || undefined,
                os: ua.os || undefined,
                osVersion: ua.osVersion || undefined,
                deviceType: ua.deviceType !== 'unknown' ? ua.deviceType : undefined,
                device: ua.device || undefined,
              }
            : {}),
          ...(body.fbclid && !doc.fbclid ? { fbclid: String(body.fbclid) } : {}),
          ...(body.gclid && !doc.gclid ? { gclid: String(body.gclid) } : {}),
          ...(body.msclkid && !doc.msclkid ? { msclkid: String(body.msclkid) } : {}),
          ...(body.ttclid && !doc.ttclid ? { ttclid: String(body.ttclid) } : {}),
          ...(body.utmSource && !doc.utmSource
            ? { utmSource: String(body.utmSource) }
            : {}),
          ...(body.utmMedium && !doc.utmMedium
            ? { utmMedium: String(body.utmMedium) }
            : {}),
          ...(body.utmCampaign && !doc.utmCampaign
            ? { utmCampaign: String(body.utmCampaign) }
            : {}),
        },
        overrideAccess: true,
      })

      return NextResponse.json({
        ok: true,
        id: updated.id,
        visitId,
        created: false,
      })
    }

    // ── Create new session ──────────────────────────────────────────────────
    const created = await payload.create({
      collection: 'visits',
      data: {
        visitId,
        ...(visitorId ? { visitorId } : {}),
        source,
        gclid: body.gclid ? String(body.gclid) : undefined,
        fbclid: body.fbclid ? String(body.fbclid) : undefined,
        msclkid: body.msclkid ? String(body.msclkid) : undefined,
        ttclid: body.ttclid ? String(body.ttclid) : undefined,
        utmSource: body.utmSource ? String(body.utmSource) : undefined,
        utmMedium: body.utmMedium ? String(body.utmMedium) : undefined,
        utmCampaign: body.utmCampaign ? String(body.utmCampaign) : undefined,
        host: host || undefined,
        ip: ip || undefined,
        referrer: referrer || undefined,
        ...(geo ? { location: geo } : {}),
        browser: ua.browser || undefined,
        browserVersion: ua.browserVersion || undefined,
        os: ua.os || undefined,
        osVersion: ua.osVersion || undefined,
        deviceType: ua.deviceType !== 'unknown' ? ua.deviceType : undefined,
        device: ua.device || undefined,
        firstPage: page,
        pageViews: 1,
        pages: [
          {
            path: page,
            title,
            room: room || undefined,
            visitedAt: now,
          },
        ],
        rooms: room ? [{ roomId: room }] : [],
        startedAt: now,
        lastSeenAt: now,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      ok: true,
      id: created.id,
      visitId,
      created: true,
    })
  } catch (error) {
    console.error('[analytics/init]', error)
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
