/**
 * Meta (Facebook) Pixel helpers.
 * content_ids must match the catalogue feed <g:id> (product.id).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

type AddToCartParams = {
  contentIds: string | string[]
  value: number
  currency?: string
  contentType?: 'product' | 'product_group'
  contents?: Array<{ id: string; quantity: number; item_price?: number }>
}

type ViewContentParams = {
  contentIds: string | string[]
  value?: number
  currency?: string
  contentType?: 'product' | 'product_group'
}

type PurchaseParams = {
  contentIds: string | string[]
  value: number
  currency?: string
  contentType?: 'product' | 'product_group'
  contents?: Array<{ id: string; quantity: number; item_price?: number }>
  numItems?: number
}

function toIds(ids: string | string[]): string[] {
  return (Array.isArray(ids) ? ids : [ids]).map(String).filter(Boolean)
}

function safeFbq(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  try {
    window.fbq(...args)
  } catch (e) {
    console.warn('[Meta Pixel]', e)
  }
}

export function trackAddToCart({
  contentIds,
  value,
  currency = 'TND',
  contentType = 'product',
  contents,
}: AddToCartParams) {
  const ids = toIds(contentIds)
  if (!ids.length) return

  safeFbq('track', 'AddToCart', {
    content_ids: ids,
    content_type: contentType,
    value: Number(value) || 0,
    currency,
    ...(contents?.length ? { contents } : {}),
  })
}

export function trackViewContent({
  contentIds,
  value,
  currency = 'TND',
  contentType = 'product',
}: ViewContentParams) {
  const ids = toIds(contentIds)
  if (!ids.length) return

  safeFbq('track', 'ViewContent', {
    content_ids: ids,
    content_type: contentType,
    ...(value != null ? { value: Number(value) || 0, currency } : {}),
  })
}

export function trackPurchase({
  contentIds,
  value,
  currency = 'TND',
  contentType = 'product',
  contents,
  numItems,
}: PurchaseParams) {
  const ids = toIds(contentIds)
  if (!ids.length) return

  safeFbq('track', 'Purchase', {
    content_ids: ids,
    content_type: contentType,
    value: Number(value) || 0,
    currency,
    ...(contents?.length ? { contents } : {}),
    ...(numItems != null ? { num_items: numItems } : {}),
  })
}
