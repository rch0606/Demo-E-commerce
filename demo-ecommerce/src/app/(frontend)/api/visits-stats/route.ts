import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TopRow = { label: string; count: number }

/** In-memory cache — KPI block is expensive; list stays instant */
let cache: { at: number; body: unknown } | null = null
const CACHE_MS = 60_000

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function bump(map: Map<string, number>, key: string, by = 1) {
  const k = String(key || '').trim()
  if (!k) return
  map.set(k, (map.get(k) || 0) + by)
}

function topFromMap(map: Map<string, number>, limit = 5): TopRow[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

export async function GET(_req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const hdrs = await getHeaders()
    const { user } = await payload.auth({ headers: hdrs })
    const role = (user as { role?: string } | null)?.role
    if (!user || (role !== 'owner' && role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (cache && Date.now() - cache.at < CACHE_MS) {
      return NextResponse.json(cache.body, {
        headers: { 'X-Visits-Stats-Cache': 'HIT' },
      })
    }

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now)
    startOfMonth.setDate(startOfMonth.getDate() - 30)
    startOfMonth.setHours(0, 0, 0, 0)

    // Fewer queries: time windows + sources + channels + one small sample
    const [
      totalAll,
      todayCount,
      weekCount,
      monthCount,
      adsCount,
      organicCount,
      socialCount,
      directCount,
      referralCount,
      googleCount,
      tiktokCount,
      fbCount,
      instaCount,
      sample,
    ] = await Promise.all([
      payload.find({ collection: 'visits', limit: 0, depth: 0 }),
      payload.find({
        collection: 'visits',
        where: { startedAt: { greater_than_equal: startOfToday.toISOString() } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { startedAt: { greater_than_equal: startOfWeek.toISOString() } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { startedAt: { greater_than_equal: startOfMonth.toISOString() } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { source: { equals: 'ads' } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { source: { equals: 'organic' } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { source: { equals: 'social' } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { source: { equals: 'direct' } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { source: { equals: 'referral' } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { gclid: { exists: true } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { ttclid: { exists: true } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: { fbclid: { exists: true } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        where: {
          or: [
            { utmSource: { equals: 'instagram' } },
            { utmSource: { equals: 'ig' } },
            { utmSource: { equals: 'IG' } },
          ],
        },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'visits',
        limit: 80,
        depth: 0,
        sort: '-startedAt',
        select: {
          pageViews: true,
          firstPage: true,
          utmCampaign: true,
          deviceType: true,
          location: true,
          events: true,
        },
      }),
    ])

    const total = totalAll.totalDocs || 0
    const ads = adsCount.totalDocs || 0
    const organic = organicCount.totalDocs || 0
    const social = socialCount.totalDocs || 0
    const direct = directCount.totalDocs || 0
    const referral = referralCount.totalDocs || 0

    let bounce = 0
    let withPurchase = 0
    let withBeginCheckout = 0
    let withAddToCart = 0
    let withViewProduct = 0
    let pagesSum = 0
    let pagesN = 0

    const landingMap = new Map<string, number>()
    const campaignMap = new Map<string, number>()
    const cityMap = new Map<string, number>()
    const deviceMap = new Map<string, number>()

    for (const doc of sample.docs as any[]) {
      const pv = Number(doc.pageViews) || 1
      pagesSum += pv
      pagesN += 1
      if (pv <= 1) bounce += 1
      if (doc.firstPage) bump(landingMap, String(doc.firstPage))
      if (doc.utmCampaign) bump(campaignMap, String(doc.utmCampaign))
      if (doc.location?.city) {
        const city = doc.location.countryCode
          ? `${doc.location.city} (${doc.location.countryCode})`
          : String(doc.location.city)
        bump(cityMap, city)
      }
      if (doc.deviceType && doc.deviceType !== 'unknown') {
        bump(deviceMap, String(doc.deviceType))
      }
      const events = Array.isArray(doc.events) ? doc.events : []
      const types = new Set(
        events.map((e: any) => String(e?.type || '').toLowerCase()).filter(Boolean),
      )
      if (types.has('view_product')) withViewProduct += 1
      if (types.has('add_to_cart')) withAddToCart += 1
      if (types.has('begin_checkout')) withBeginCheckout += 1
      if (types.has('purchase')) withPurchase += 1
    }

    const sampleN = sample.docs.length || 1

    const body = {
      total,
      today: todayCount.totalDocs || 0,
      week: weekCount.totalDocs || 0,
      month: monthCount.totalDocs || 0,
      ads,
      organic,
      social,
      direct,
      referral,
      adsPct: pct(ads, total),
      organicPct: pct(organic, total),
      socialPct: pct(social, total),
      directPct: pct(direct, total),
      referralPct: pct(referral, total),
      fb: fbCount.totalDocs || 0,
      insta: instaCount.totalDocs || 0,
      google: googleCount.totalDocs || 0,
      tiktok: tiktokCount.totalDocs || 0,
      sampleSize: sample.docs.length,
      bouncePct: pct(bounce, sampleN),
      conversionPct: pct(withPurchase, sampleN),
      avgPages: pagesN ? Math.round((pagesSum / pagesN) * 10) / 10 : 0,
      funnel: {
        sessions: sample.docs.length,
        viewProduct: withViewProduct,
        addToCart: withAddToCart,
        beginCheckout: withBeginCheckout,
        purchase: withPurchase,
      },
      topLanding: topFromMap(landingMap, 5),
      topCampaigns: topFromMap(campaignMap, 5),
      topCities: topFromMap(cityMap, 5),
      devices: {
        mobile: deviceMap.get('mobile') || 0,
        desktop: deviceMap.get('desktop') || 0,
        tablet: deviceMap.get('tablet') || 0,
      },
    }

    cache = { at: Date.now(), body }

    return NextResponse.json(body, {
      headers: { 'X-Visits-Stats-Cache': 'MISS' },
    })
  } catch (err: any) {
    console.error('[visits-stats]', err?.message || err)
    return NextResponse.json(
      { error: err?.message || 'Failed to load visits stats' },
      { status: 500 },
    )
  }
}
