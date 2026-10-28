'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/** Session id cookie — short lived; each session = one Visits document */
const SESSION_COOKIE = '_tid'
const SESSION_MINUTES = 30

/** Long-lived visitor id (unique person across sessions) */
const VISITOR_COOKIE = '_vid'
const VISITOR_DAYS = 365

const SESSION_ACTIVITY_KEY = '_tid_activity'
const FLUSH_MS = 2500
const MAX_BUFFER = 60

/** Shared with src/lib/analytics.ts — current rrweb room */
const ROOM_STORAGE_KEY = '_rr_room'

const PAID_MEDIUMS = new Set([
  'cpc',
  'ppc',
  'paid',
  'paid-social',
  'paid_social',
  'display',
  'banner',
  'retargeting',
  'remarketing',
])

/**
 * Drop only noisy pointer streams. Keep ALL mutations (0) and style updates —
 * filtering those causes "Node with id X not found" on replay.
 * IncrementalSource: MouseMove=1, TouchMove=6
 */
const DROP_INCREMENTAL_SOURCES = new Set([1, 6])

type TrafficSource = {
  source: 'organic' | 'ads' | 'social' | 'referral' | 'direct'
  gclid: string | null
  fbclid: string | null
  msclkid: string | null
  ttclid: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((r) => r.startsWith(name + '='))
  return match ? decodeURIComponent(match.split('=')[1] || '') : null
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function getOrCreateVisitorId(): string {
  let id = getCookie(VISITOR_COOKIE)
  if (!id) {
    id = uuid()
    setCookie(VISITOR_COOKIE, id, VISITOR_DAYS)
  }
  return id
}

/**
 * Session id (_tid): new session if cookie missing OR last activity > 30 min ago.
 * Each new session creates a new Visits row → realistic day / week / month counts.
 */
function getOrCreateSessionId(): string {
  const now = Date.now()
  let lastActivity = 0
  try {
    lastActivity = Number(sessionStorage.getItem(SESSION_ACTIVITY_KEY) || 0)
  } catch {
    /* ignore */
  }

  const expired =
    !lastActivity || now - lastActivity > SESSION_MINUTES * 60 * 1000

  let id = getCookie(SESSION_COOKIE)
  if (!id || expired) {
    id = uuid()
    // Cookie ~1 day max; real timeout is SESSION_MINUTES via activity stamp
    setCookie(SESSION_COOKIE, id, 1)
  }

  try {
    sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(now))
  } catch {
    /* ignore */
  }

  // Refresh cookie expiry while active
  setCookie(SESSION_COOKIE, id, 1)
  return id
}

/** @deprecated use getOrCreateSessionId — kept name for minimal churn below */
function getOrCreateVisitId(): string {
  return getOrCreateSessionId()
}

function generateRoomId(): string {
  return uuid().replace(/-/g, '').slice(0, 15)
}

function setCurrentRoom(roomId: string) {
  try {
    sessionStorage.setItem(ROOM_STORAGE_KEY, roomId)
  } catch {
    /* ignore */
  }
}


function detectSource(): TrafficSource {
  // Default = direct (never organic) when we cannot read the browser
  if (typeof window === 'undefined') {
    return {
      source: 'direct',
      gclid: null,
      fbclid: null,
      msclkid: null,
      ttclid: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
    }
  }

  const p = new URLSearchParams(window.location.search)
  const gclid = p.get('gclid')
  const fbclid = p.get('fbclid')
  const msclkid = p.get('msclkid')
  const ttclid = p.get('ttclid')
  const utmSource = p.get('utm_source')
  const utmMedium = p.get('utm_medium')
  const utmCampaign = p.get('utm_campaign')

  const mediumLower = (utmMedium || '').toLowerCase()
  const sourceLower = (utmSource || '').toLowerCase()
  const isPaidMedium = mediumLower !== '' && PAID_MEDIUMS.has(mediumLower)

  // Paid social often uses utm_medium=social|paid_social with fb/ig/tt source
  const isPaidSocialUtm =
    isPaidMedium ||
    (['paid', 'cpc', 'ppc'].some((m) => mediumLower.includes(m)) &&
      ['facebook', 'fb', 'instagram', 'ig', 'tiktok', 'meta'].some((s) =>
        sourceLower.includes(s),
      ))

  let source: TrafficSource['source'] = 'direct'

  const isSearchHost = (host: string) =>
    /google\.|bing\.|yahoo\.|duckduckgo\.|yandex\.|baidu\.|ecosia\./i.test(host)
  const isSocialHost = (host: string) =>
    /facebook\.|instagram\.|tiktok\.|t\.co$|twitter\.|x\.com|linkedin\.|pinterest\.|snapchat\.|youtube\.|whatsapp\./i.test(
      host,
    )

  if (gclid || fbclid || msclkid || ttclid || isPaidMedium || isPaidSocialUtm) {
    source = 'ads'
  } else if (utmSource) {
    const src = sourceLower
    if (
      ['facebook', 'fb', 'instagram', 'ig', 'tiktok', 'twitter', 'x', 'linkedin', 'youtube', 'social', 'whatsapp'].some(
        (s) => src.includes(s),
      )
    ) {
      source = 'social'
    } else if (
      ['google', 'bing', 'yahoo', 'duckduckgo', 'yandex', 'baidu', 'ecosia'].some((s) =>
        src.includes(s),
      )
    ) {
      source = 'organic'
    } else {
      source = 'referral'
    }
  } else if (!document.referrer) {
    source = 'direct'
  } else {
    try {
      const refHost = new URL(document.referrer).hostname.replace(/^www\./, '')
      const currentHost = window.location.hostname.replace(/^www\./, '')
      if (!refHost || refHost === currentHost) {
        source = 'direct'
      } else if (isSearchHost(refHost)) {
        source = 'organic'
      } else if (isSocialHost(refHost)) {
        source = 'social'
      } else {
        source = 'referral'
      }
    } catch {
      source = 'referral'
    }
  }

  // Infer platform from referrer when UTM is missing
  // (Instagram in-app often has no utm but referrer = l.instagram.com / instagram.com)
  let resolvedUtmSource = utmSource
  if (!resolvedUtmSource && typeof document !== 'undefined' && document.referrer) {
    try {
      const refHost = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase()
      if (/instagram/.test(refHost)) resolvedUtmSource = 'instagram'
      else if (/facebook|fb\.com|fb\.me|m\.facebook/.test(refHost))
        resolvedUtmSource = 'facebook'
      else if (/tiktok|t\.tiktok/.test(refHost)) resolvedUtmSource = 'tiktok'
      else if (/google\./.test(refHost)) resolvedUtmSource = 'google'
    } catch {
      /* ignore */
    }
  }

  // Meta click id (fbclid) is shared by FB + IG ads — if referrer/utm is Instagram, keep instagram
  if (
    fbclid &&
    resolvedUtmSource &&
    /instagram|\big\b/.test(String(resolvedUtmSource).toLowerCase())
  ) {
    // keep instagram as utmSource so admin shows Insta, not FB
  } else if (fbclid && !resolvedUtmSource) {
    // Default Meta click without platform signal → facebook
    resolvedUtmSource = 'facebook'
  }

  return {
    source,
    gclid,
    fbclid,
    msclkid,
    ttclid,
    utmSource: resolvedUtmSource,
    utmMedium,
    utmCampaign,
  }
}

function shouldEmitEvent(event: any): boolean {
  if (!event) return false
  if (event.type !== 3) return true // FullSnapshot, Meta, etc.
  return !DROP_INCREMENTAL_SOURCES.has(event.data?.source)
}

/**
 * Post JSON to our APIs.
 * IMPORTANT: do NOT use keepalive for large payloads.
 * Chrome limits keepalive bodies to ~64KB — FullSnapshot is often much larger
 * and was silently dropped, causing blank replays.
 */
async function postJson(
  url: string,
  data: Record<string, unknown>,
  opts?: { keepalive?: boolean },
) {
  try {
    const body = JSON.stringify(data)
    const useKeepalive = Boolean(opts?.keepalive) && body.length < 50_000
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      ...(useKeepalive ? { keepalive: true } : {}),
    })
    if (!res.ok && process.env.NODE_ENV === 'development') {
      console.warn('[AnalyticsTracker] HTTP', res.status, url)
    }
    return res.ok
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AnalyticsTracker]', err)
    }
    return false
  }
}

/**
 * Analytics + optional screen recording (rrweb).
 * - Cookie `_tid` = session (30 min inactivity → new session / new Visits row)
 * - Cookie `_vid` = visitor (~1 year)
 * - init / page / events APIs
 * - rrweb → POST /api/record/event (batched)
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initSent = useRef(false)
  const lastPath = useRef<string | null>(null)
  const visitIdRef = useRef<string | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const bufferRef = useRef<any[]>([])
  const stopRecordingRef = useRef<null | (() => void)>(null)
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const takeFullSnapshotRef = useRef<null | (() => void)>(null)

  const flushBuffer = (opts?: { urgent?: boolean }) => {
    const events = bufferRef.current
    if (!events.length || !roomIdRef.current) return

    const roomId = roomIdRef.current
    const visitId = visitIdRef.current
    const host = typeof window !== 'undefined' ? window.location.hostname : undefined

    // Split: send FullSnapshots alone first (large), then the rest in chunks
    const batch = events.splice(0, events.length)
    const snapshots = batch.filter((e) => e?.type === 2 || e?.type === 4)
    const rest = batch.filter((e) => e?.type !== 2 && e?.type !== 4)

    const send = (chunk: any[]) => {
      if (!chunk.length) return
      void postJson(
        '/api/record/event',
        { roomId, host, visitId, events: chunk },
        // never keepalive for record batches (snapshots are big)
        { keepalive: false },
      )
    }

    // Meta + FullSnapshot first (order matters for the player)
    if (snapshots.length) send(snapshots)

    // Remaining events in chunks of 40
    const CHUNK = 40
    for (let i = 0; i < rest.length; i += CHUNK) {
      send(rest.slice(i, i + CHUNK))
    }
  }

  // Init once + start recording
  useEffect(() => {
    if (typeof window === 'undefined' || initSent.current) return

    const visitId = getOrCreateSessionId()
    const visitorId = getOrCreateVisitorId()
    const roomId = generateRoomId()
    visitIdRef.current = visitId
    roomIdRef.current = roomId
    setCurrentRoom(roomId)

    const src = detectSource()
    const page = window.location.pathname
    const title = document.title || ''

    initSent.current = true
    lastPath.current = page

    void postJson('/api/analytics/init', {
      visitId,
      visitorId,
      room: roomId,
      source: src.source,
      gclid: src.gclid,
      fbclid: src.fbclid,
      msclkid: src.msclkid,
      ttclid: src.ttclid,
      utmSource: src.utmSource,
      utmMedium: src.utmMedium,
      utmCampaign: src.utmCampaign,
      host: window.location.hostname,
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
      page,
      title,
    })

    // rrweb (dynamic import — requires: npm i rrweb)
    let cancelled = false
    let emittedCount = 0
    ;(async () => {
      try {
        // Resolve record from rrweb (named or default export)
        let recordFn: any = null
        try {
          const mod: any = await import('rrweb')
          recordFn = mod.record || mod.default?.record || mod.default
        } catch {
          recordFn = null
        }

        if (cancelled || typeof recordFn !== 'function') {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[AnalyticsTracker] rrweb.record not found — install: npm i rrweb')
          }
          return
        }

        if (typeof recordFn.takeFullSnapshot === 'function') {
          takeFullSnapshotRef.current = () => {
            try {
              recordFn.takeFullSnapshot()
            } catch (e) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('[AnalyticsTracker] takeFullSnapshot failed', e)
              }
            }
          }
        }

        stopRecordingRef.current = recordFn({
          emit(event: any) {
            if (!event) return
            const t = Number(event.type)
            const isSnapshot = t === 2
            const isMeta = t === 4

            if (process.env.NODE_ENV === 'development' && emittedCount < 15) {
              emittedCount++
              console.info('[AnalyticsTracker] rrweb event', {
                n: emittedCount,
                type: t,
                source: event.data?.source,
              })
            }

            if (!isSnapshot && !isMeta && !shouldEmitEvent(event)) return

            bufferRef.current.push(event)

            // FullSnapshot / Meta → flush immediately (own request)
            if (isSnapshot || isMeta || bufferRef.current.length >= MAX_BUFFER) {
              flushBuffer()
            }
          },
          // Pas de « checkout » périodique : chaque copie complète de la page
          // (~400 Ko avec le CSS inline) représentait 95 % du stockage. Le
          // replay se reconstruit à partir d'une seule copie + des mutations.
          maskAllInputs: true,
          maskTextClass: 'rr-mask',
          blockClass: 'rr-block',
          // Do NOT block nextjs-portal here — it can break the first snapshot tree
          ignoreClass: 'rr-ignore',
          inlineStylesheet: true,
          recordCanvas: false,
          // Fonts make snapshots huge — keep off for reliable upload
          collectFonts: false,
          sampling: { scroll: 150, input: 'last', mousemove: false },
        }) as unknown as () => void

        // Force snapshots after mount / hydration (Next.js)
        // Une seule copie forcée, après l'hydratation Next.js (la copie
        // initiale de rrweb peut être prise avant que la page soit rendue).
        setTimeout(() => {
          takeFullSnapshotRef.current?.()
          flushBuffer()
        }, 1500)

        flushTimerRef.current = setInterval(flushBuffer, FLUSH_MS)
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AnalyticsTracker] rrweb not available', err)
        }
      }
    })()

    const onUnload = () => flushBuffer()
    window.addEventListener('pagehide', onUnload)
    window.addEventListener('beforeunload', onUnload)

    return () => {
      cancelled = true
      window.removeEventListener('pagehide', onUnload)
      window.removeEventListener('beforeunload', onUnload)
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
      try {
        stopRecordingRef.current?.()
      } catch {
        /* ignore */
      }
      flushBuffer()
    }
  }, [])

  // Client-side navigations — new room per page (like old tracker)
  useEffect(() => {
    if (typeof window === 'undefined' || !initSent.current) return

    const page = pathname || window.location.pathname
    if (lastPath.current === page) return
    lastPath.current = page

    // Flush previous room, then new room + FullSnapshot (required for non-blank replay)
    flushBuffer()
    const roomId = generateRoomId()
    roomIdRef.current = roomId
    setCurrentRoom(roomId)
    bufferRef.current = []
    takeFullSnapshotRef.current?.()

    // Sliding session: refresh activity; if 30 min elapsed, new session id + init
    const visitId = getOrCreateSessionId()
    const sessionChanged = visitIdRef.current && visitIdRef.current !== visitId
    visitIdRef.current = visitId

    if (sessionChanged) {
      const src = detectSource()
      void postJson('/api/analytics/init', {
        visitId,
        visitorId: getOrCreateVisitorId(),
        room: roomId,
        source: src.source,
        gclid: src.gclid,
        fbclid: src.fbclid,
        msclkid: src.msclkid,
        ttclid: src.ttclid,
        utmSource: src.utmSource,
        utmMedium: src.utmMedium,
        utmCampaign: src.utmCampaign,
        host: window.location.hostname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
        page,
        title: document.title || '',
      })
    } else {
      void postJson('/api/analytics/page', {
        visitId,
        page,
        title: document.title || '',
        room: roomId,
      })
    }
  }, [pathname, searchParams])

  return null
}
