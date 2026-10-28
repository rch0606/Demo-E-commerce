/**
 * First-party analytics helpers (our Visits collection).
 * Use alongside Meta Pixel helpers in metaPixel.ts.
 *
 * Cookie `_tid` is created by AnalyticsTracker.
 */

const VISIT_COOKIE = '_tid'
/** Current rrweb room — written by AnalyticsTracker */
const ROOM_STORAGE_KEY = '_rr_room'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((r) => r.startsWith(name + '='))
  return match ? decodeURIComponent(match.split('=')[1] || '') : null
}

function getVisitId(): string | null {
  return getCookie(VISIT_COOKIE)
}

function getRoomId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(ROOM_STORAGE_KEY) || null
  } catch {
    return null
  }
}

/**
 * Track a custom event on the current visit.
 * Safe to call from any client component — never throws.
 *
 * @example
 * trackEvent('add_to_cart', { productId: 'abc', value: 49.9, quantity: 1 })
 * trackEvent('purchase', { orderId: 'CMD-000123', value: 120 })
 * trackEvent('view_product', { productId: 'abc' })
 */
export function trackEvent(
  type: string,
  meta?: Record<string, unknown>,
  path?: string,
): void {
  if (typeof window === 'undefined') return

  const visitId = getVisitId()
  if (!visitId) return

  const cleanType = String(type || '')
    .trim()
    .toLowerCase()
  if (!cleanType) return

  const roomId = getRoomId()

  const payload = {
    visitId,
    type: cleanType,
    path: path || window.location.pathname,
    ...(roomId ? { roomId } : {}),
    ...(meta && typeof meta === 'object' ? { meta } : {}),
  }

  try {
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // silent
    })
  } catch {
    // silent — analytics must never break UX
  }
}

/** Convenience wrappers for common shop events */

export function trackViewProduct(meta: {
  productId: string
  value?: number
  name?: string
}) {
  trackEvent('view_product', meta)
}

export function trackAddToCart(meta: {
  productId: string
  value?: number
  quantity?: number
  name?: string
  source?: string
}) {
  trackEvent('add_to_cart', meta)
}

/** Add to wishlist / favoris */
export function trackAddToWishlist(meta: {
  productId: string
  value?: number
  name?: string
  source?: string
}) {
  trackEvent('add_to_wishlist', meta)
}

/** Remove from wishlist / favoris */
export function trackRemoveFromWishlist(meta: {
  productId: string
  name?: string
}) {
  trackEvent('remove_from_wishlist', meta)
}

export function trackRemoveFromCart(meta: {
  productId: string
  quantity?: number
}) {
  trackEvent('remove_from_cart', meta)
}

export function trackBeginCheckout(meta?: {
  productId?: string
  name?: string
  /** All product IDs in the cart / commande */
  productIds?: string[]
  /** All product names in the cart / commande */
  productNames?: string[]
  value?: number
  quantity?: number
  itemCount?: number
}) {
  trackEvent('begin_checkout', meta)
}

export function trackPurchase(meta: {
  orderId?: string
  orderNumber?: string
  value?: number
  itemCount?: number
  productId?: string
  name?: string
  productIds?: string[]
  productNames?: string[]
}) {
  trackEvent('purchase', meta)
}

export function trackApplyPromo(meta: {
  code: string
  discountAmount?: number
}) {
  trackEvent('apply_promo', meta)
}

export function trackClickWhatsApp(meta?: { productId?: string }) {
  trackEvent('click_whatsapp', meta)
}

export function trackClickInstagram(meta?: { url?: string }) {
  trackEvent('click_instagram', meta)
}

export function trackClickFacebook(meta?: { url?: string }) {
  trackEvent('click_facebook', meta)
}

export function trackClickTikTok(meta?: { url?: string }) {
  trackEvent('click_tiktok', meta)
}

/** Generic social click — maps network name to a typed event */
export function trackClickSocial(
  network: string,
  meta?: { url?: string; productId?: string },
) {
  const key = (network || '').toLowerCase()
  if (key.includes('whatsapp')) return trackClickWhatsApp(meta)
  if (key.includes('instagram') || key.includes('insta')) return trackClickInstagram(meta)
  if (key.includes('facebook') || key === 'fb') return trackClickFacebook(meta)
  if (key.includes('tiktok')) return trackClickTikTok(meta)
  trackEvent('click_social', { network, ...meta })
}

