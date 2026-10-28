/**
 * Resolve approximate location from a public IP.
 * Uses ipapi.co free tier (≈1000 req/day) with a simple in-memory cache.
 * Never throws — returns null on any failure so analytics never break.
 */

export type GeoLocation = {
  country: string | null
  countryCode: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  timezone: string | null
  org: string | null
}

type CacheEntry = {
  data: GeoLocation | null
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h
const MAX_CACHE_SIZE = 5000

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return true
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true
  // IPv6 local / unique-local
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) return true
  return false
}

function getFromCache(ip: string): GeoLocation | null | undefined {
  const entry = cache.get(ip)
  if (!entry) return undefined
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(ip)
    return undefined
  }
  return entry.data
}

function setCache(ip: string, data: GeoLocation | null) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now()
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) cache.delete(key)
    }
  }
  cache.set(ip, { data, timestamp: Date.now() })
}

/**
 * Returns location for a public IP, or null if private / failed / rate-limited.
 */
export async function getLocationFromIp(ip: string | null | undefined): Promise<GeoLocation | null> {
  if (!ip || isPrivateIp(ip)) return null

  const cached = getFromCache(ip)
  if (cached !== undefined) return cached

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Shop-Analytics/1.0',
      },
      // short timeout via AbortSignal if available
      signal: AbortSignal.timeout?.(4000),
    })

    if (!res.ok) {
      setCache(ip, null)
      return null
    }

    const data = (await res.json()) as Record<string, any>

    if (data?.error) {
      setCache(ip, null)
      return null
    }

    const location: GeoLocation = {
      country: data.country_name || null,
      countryCode: data.country || data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      latitude: typeof data.latitude === 'number' ? data.latitude : null,
      longitude: typeof data.longitude === 'number' ? data.longitude : null,
      timezone: data.timezone || null,
      org: data.org || null,
    }

    setCache(ip, location)
    return location
  } catch (err) {
    console.warn('[ipGeolocation]', ip, err)
    setCache(ip, null)
    return null
  }
}
