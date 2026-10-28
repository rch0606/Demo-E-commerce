import { getPayload } from 'payload'
import config from '@payload-config'
import VisitsListClient from './index.client'

interface PageProps {
  searchParams: Promise<{
    search?: string
    source?: string
    sort?: string
    page?: string
  }>
}

type TopRow = { label: string; count: number }

type VisitsStats = {
  total: number
  today: number
  week: number
  month: number
  ads: number
  organic: number
  social: number
  direct: number
  referral: number
  adsPct: number
  organicPct: number
  socialPct: number
  directPct: number
  referralPct: number
  fb: number
  insta: number
  google: number
  tiktok: number
  sampleSize: number
  bouncePct: number
  conversionPct: number
  avgPages: number
  funnel: {
    sessions: number
    viewProduct: number
    addToCart: number
    beginCheckout: number
    purchase: number
  }
  topLanding: TopRow[]
  topCampaigns: TopRow[]
  topCities: TopRow[]
  devices: { mobile: number; desktop: number; tablet: number }
}

/** Shared across requests in the same Node process — avoids re-scanning 10k+ docs every click */
let statsCache: { at: number; data: VisitsStats } | null = null
const STATS_TTL_MS = 120_000 // 2 minutes

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

function countFromFacet(rows: Array<{ n?: number }> | undefined): number {
  return Number(rows?.[0]?.n) || 0
}

function buildStatsFromSample(
  total: number,
  today: number,
  week: number,
  month: number,
  bySource: Array<{ _id?: string | null; n?: number }>,
  google: number,
  tiktok: number,
  fb: number,
  insta: number,
  sampleDocs: any[],
): VisitsStats {
  const sourceMap: Record<string, number> = {}
  for (const row of bySource || []) {
    const key = String(row._id || 'direct')
    sourceMap[key] = Number(row.n) || 0
  }

  const ads = sourceMap.ads || 0
  const organic = sourceMap.organic || 0
  const social = sourceMap.social || 0
  const direct = sourceMap.direct || 0
  const referral = sourceMap.referral || 0

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

  for (const doc of sampleDocs) {
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

  const sampleN = sampleDocs.length || 1

  return {
    total,
    today,
    week,
    month,
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
    fb,
    insta,
    google,
    tiktok,
    sampleSize: sampleDocs.length,
    bouncePct: pct(bounce, sampleN),
    conversionPct: pct(withPurchase, sampleN),
    avgPages: pagesN ? Math.round((pagesSum / pagesN) * 10) / 10 : 0,
    funnel: {
      sessions: sampleDocs.length,
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
}

/** One Mongo $facet scan instead of ~15 separate finds */
async function loadStatsViaAggregation(payload: any): Promise<VisitsStats | null> {
  try {
    const model =
      payload?.db?.collections?.visits ||
      payload?.db?.collections?.['visits']

    if (!model || typeof model.aggregate !== 'function') {
      return null
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

    const [facet] = await model.aggregate([
      {
        $facet: {
          total: [{ $count: 'n' }],
          bySource: [{ $group: { _id: '$source', n: { $sum: 1 } } }],
          today: [
            { $match: { startedAt: { $gte: startOfToday } } },
            { $count: 'n' },
          ],
          week: [
            { $match: { startedAt: { $gte: startOfWeek } } },
            { $count: 'n' },
          ],
          month: [
            { $match: { startedAt: { $gte: startOfMonth } } },
            { $count: 'n' },
          ],
          google: [
            {
              $match: {
                gclid: { $exists: true, $type: 'string', $ne: '' },
              },
            },
            { $count: 'n' },
          ],
          tiktok: [
            {
              $match: {
                ttclid: { $exists: true, $type: 'string', $ne: '' },
              },
            },
            { $count: 'n' },
          ],
          fb: [
            {
              $match: {
                fbclid: { $exists: true, $type: 'string', $ne: '' },
              },
            },
            { $count: 'n' },
          ],
          insta: [
            {
              $match: {
                utmSource: { $in: ['instagram', 'ig', 'IG'] },
              },
            },
            { $count: 'n' },
          ],
          sample: [
            { $sort: { startedAt: -1 } },
            { $limit: 60 },
            {
              $project: {
                pageViews: 1,
                firstPage: 1,
                utmCampaign: 1,
                deviceType: 1,
                location: 1,
                // only event types — drop heavy meta
                events: { $map: { input: { $ifNull: ['$events', []] }, as: 'e', in: { type: '$$e.type' } } },
              },
            },
          ],
        },
      },
    ])

    if (!facet) return null

    return buildStatsFromSample(
      countFromFacet(facet.total),
      countFromFacet(facet.today),
      countFromFacet(facet.week),
      countFromFacet(facet.month),
      facet.bySource || [],
      countFromFacet(facet.google),
      countFromFacet(facet.tiktok),
      countFromFacet(facet.fb),
      countFromFacet(facet.insta),
      facet.sample || [],
    )
  } catch (err: any) {
    console.error('[VisitsList] aggregation failed, will fallback:', err?.message || err)
    return null
  }
}

/** Fallback: fewer parallel counts if aggregation unavailable */
async function loadStatsViaFinds(payload: any): Promise<VisitsStats> {
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(startOfWeek.getDate() - 7)
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now)
  startOfMonth.setDate(startOfMonth.getDate() - 30)
  startOfMonth.setHours(0, 0, 0, 0)

  const [totalAll, todayCount, weekCount, monthCount, sample] = await Promise.all([
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
      limit: 60,
      depth: 0,
      sort: '-startedAt',
      select: {
        pageViews: true,
        firstPage: true,
        utmCampaign: true,
        deviceType: true,
        location: true,
        source: true,
        events: true,
        gclid: true,
        fbclid: true,
        ttclid: true,
        utmSource: true,
      },
    }),
  ])

  // Source mix from sample only in fallback (fast, approximate)
  const bySourceMap = new Map<string, number>()
  let google = 0
  let tiktok = 0
  let fb = 0
  let insta = 0
  for (const doc of sample.docs as any[]) {
    bump(bySourceMap, String(doc.source || 'direct'))
    if (doc.gclid) google += 1
    if (doc.ttclid) tiktok += 1
    if (doc.fbclid) fb += 1
    const u = String(doc.utmSource || '').toLowerCase()
    if (u === 'instagram' || u === 'ig') insta += 1
  }

  // Scale sample source counts to total for rough % (better than 15 full counts)
  const sampleN = sample.docs.length || 1
  const total = totalAll.totalDocs || 0
  const scale = total / sampleN
  const bySource = [...bySourceMap.entries()].map(([id, n]) => ({
    _id: id,
    n: Math.round(n * scale),
  }))

  return buildStatsFromSample(
    total,
    todayCount.totalDocs || 0,
    weekCount.totalDocs || 0,
    monthCount.totalDocs || 0,
    bySource,
    // scale channel signals from sample
    Math.round(google * scale),
    Math.round(tiktok * scale),
    Math.round(fb * scale),
    Math.round(insta * scale),
    sample.docs as any[],
  )
}

async function getVisitsStats(payload: any): Promise<VisitsStats> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) {
    return statsCache.data
  }

  const aggregated = await loadStatsViaAggregation(payload)
  const data = aggregated || (await loadStatsViaFinds(payload))
  statsCache = { at: Date.now(), data }
  return data
}

export default async function VisitsList({ searchParams }: PageProps) {
  const params = await searchParams
  const payload = await getPayload({ config })

  const search = params.search ?? ''
  const source = params.source ?? ''
  const sort = params.sort ?? '-startedAt'
  const page = Number(params.page) || 1
  const limit = 15

  const conditions: any[] = []

  if (search) {
    conditions.push({
      or: [
        { visitId: { like: search } },
        { ip: { like: search } },
        { utmSource: { like: search } },
        { utmCampaign: { like: search } },
        { firstPage: { like: search } },
        { 'location.city': { like: search } },
        { 'location.country': { like: search } },
      ],
    })
  }

  if (source) {
    conditions.push({ source: { equals: source } })
  }

  // Table always fresh; KPIs from cache / one aggregation
  const [visits, stats] = await Promise.all([
    payload.find({
      collection: 'visits',
      where: conditions.length > 0 ? { and: conditions } : undefined,
      page,
      limit,
      sort,
      depth: 0,
      select: {
        visitId: true,
        displayTitle: true,
        source: true,
        pageViews: true,
        firstPage: true,
        referrer: true,
        browser: true,
        deviceType: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        fbclid: true,
        gclid: true,
        msclkid: true,
        ttclid: true,
        startedAt: true,
        lastSeenAt: true,
        location: true,
      },
    }),
    getVisitsStats(payload),
  ])

  return (
    <VisitsListClient
      initialVisits={{
        docs: visits.docs as any[],
        totalDocs: visits.totalDocs,
        totalPages: visits.totalPages,
        page: visits.page ?? 1,
      }}
      stats={stats}
    />
  )
}
