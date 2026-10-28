import { brand } from '@/brand.config'
import { google, type merchantapi_products_v1 } from 'googleapis'
import type { Payload } from 'payload'

import type { Product } from '@/payload-types'
import { applyPromoPercentage, getProductPromoPercentage } from '@/lib/categoryPromo'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * Synchronisation des produits vers Google Merchant Center (Merchant API v1).
 *
 * Variables d'environnement :
 *  - GOOGLE_MERCHANT_ID              : id du compte Merchant Center
 *  - GOOGLE_MERCHANT_DATA_SOURCE_ID  : id de la source de données "API"
 *  - GOOGLE_SERVICE_ACCOUNT_KEY_B64  : clé JSON encodée en base64 (prod, via la CI GitLab)
 *    ou GOOGLE_SERVICE_ACCOUNT_KEY   : contenu JSON brut de la clé
 *    ou GOOGLE_APPLICATION_CREDENTIALS : chemin vers le fichier JSON (en local)
 *
 * Sans GOOGLE_MERCHANT_DATA_SOURCE_ID la synchro est désactivée (utile en dev).
 */

const MERCHANT_ID = process.env.GOOGLE_MERCHANT_ID
const DATA_SOURCE_ID = process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID

const CONTENT_LANGUAGE = 'fr'
const FEED_LABEL = 'TN'
const CURRENCY = 'TND'
export const BRAND = brand.name
const MAX_ADDITIONAL_IMAGES = 10

export const isMerchantSyncEnabled = () => Boolean(MERCHANT_ID && DATA_SOURCE_ID)

const PUBLIC_SITE_URL = brand.siteUrl

/**
 * URL publique envoyée à Google. En local, le serveur tourne sur localhost :
 * Google refuserait ces liens et images, on envoie donc toujours le vrai site.
 * GOOGLE_MERCHANT_SITE_URL permet de forcer une autre adresse.
 */
export function getSiteURL() {
  const override = process.env.GOOGLE_MERCHANT_SITE_URL
  if (override) return override.replace(/\/$/, '')

  const url = getServerSideURL()
  return /localhost|127\.0\.0\.1/.test(url) ? PUBLIC_SITE_URL : url.replace(/\/$/, '')
}

/** Message court à partir d'une erreur Google (évite de logger toute la requête). */
export function describeMerchantError(error: unknown): string {
  const err = error as any
  const apiError = err?.response?.data?.error
  const reason = apiError?.details?.find((d: any) => d?.reason)?.metadata?.REASON
  const status = apiError?.code ?? err?.code ?? err?.status

  const message = apiError?.message || err?.message || String(error)
  return [status && `[${status}]`, reason && `${reason}:`, message].filter(Boolean).join(' ')
}

let auth: InstanceType<typeof google.auth.GoogleAuth> | null = null

/** Authentification du compte de service, partagée par les produits et les avis. */
export function getMerchantAuth() {
  if (auth) return auth

  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64
  const rawKey = base64Key
    ? Buffer.from(base64Key, 'base64').toString('utf8')
    : process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  auth = new google.auth.GoogleAuth({
    ...(rawKey
      ? { credentials: JSON.parse(rawKey) }
      : { keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS }),
    scopes: ['https://www.googleapis.com/auth/content'],
  })

  return auth
}

let client: merchantapi_products_v1.Merchantapi | null = null

function getClient() {
  if (client) return client

  client = google.merchantapi({ version: 'products_v1', auth: getMerchantAuth() })
  return client
}

/**
 * Nom de ressource encodé en base64url : obligatoire dès que l'offerId contient
 * `/`, `%` ou `~`, et sans risque dans tous les autres cas.
 */
const productInputName = (offerId: string) =>
  `accounts/${MERCHANT_ID}/productInputs/${Buffer.from(
    `${CONTENT_LANGUAGE}~${FEED_LABEL}~${offerId}`,
  ).toString('base64url')}`

/** L'id Payload reste stable même si la référence change : c'est notre offerId. */
const toOfferId = (product: Pick<Product, 'id'>) => String(product.id)

const toPrice = (amount: number): merchantapi_products_v1.Schema$Price => ({
  amountMicros: String(Math.round(amount * 1_000_000)),
  currencyCode: CURRENCY,
})

const toAbsoluteUrl = (media: unknown): string | null => {
  const url = media && typeof media === 'object' ? (media as { url?: string | null }).url : null
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${getSiteURL()}${url.startsWith('/') ? url : `/${url}`}`
}

/**
 * Prix affichés sur le site, dans le même ordre de priorité que le front :
 * la promo catégorie prime sur l'oldPrice propre au produit.
 */
function getPrices(product: Product) {
  const current = Number(product.currentPrice) || 0
  const promo = getProductPromoPercentage(product)

  if (promo) {
    return { price: toPrice(current), salePrice: toPrice(applyPromoPercentage(current, promo)) }
  }

  const old = Number(product.oldPrice)
  if (Number.isFinite(old) && old > current) {
    return { price: toPrice(old), salePrice: toPrice(current) }
  }

  return { price: toPrice(current), salePrice: undefined }
}

const MAX_TITLE_LENGTH = 150
const MAX_DESCRIPTION_LENGTH = 5000

/**
 * Google refuse les titres avec du texte « promotionnel » (guillemets, espaces
 * superflus…). On nettoie uniquement ce qui part vers Merchant Center : le nom
 * du produit reste inchangé dans Payload et sur le site.
 */
const cleanText = (value: string | null | undefined, maxLength: number) =>
  (value ?? '')
    .replace(/["“”«»„]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim()

/** Attend un produit lu en depth >= 1 (images peuplées) et en locale `fr`. */
export function toProductInput(product: Product): merchantapi_products_v1.Schema$ProductInput {
  const images = [
    toAbsoluteUrl(product.featuredImage),
    ...(product.gallery ?? []).map((item) => toAbsoluteUrl(item?.image)),
  ].filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index)

  const { price, salePrice } = getPrices(product)

  return {
    offerId: toOfferId(product),
    contentLanguage: CONTENT_LANGUAGE,
    feedLabel: FEED_LABEL,
    productAttributes: {
      title: cleanText(product.productTitle, MAX_TITLE_LENGTH),
      description:
        cleanText(product.description, MAX_DESCRIPTION_LENGTH) ||
        cleanText(product.productTitle, MAX_TITLE_LENGTH),
      link: `${getSiteURL()}/${CONTENT_LANGUAGE}/produit/${product.slug}`,
      imageLink: images[0],
      additionalImageLinks: images.slice(1, MAX_ADDITIONAL_IMAGES + 1),
      availability: (Number(product.totalStock) || 0) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      condition: 'NEW',
      brand: BRAND,
      // `barcode` est une référence interne, pas un GTIN/EAN ni un MPN fabricant.
      identifierExists: false,
      price,
      salePrice,
    },
  }
}

export async function upsertMerchantProduct(product: Product) {
  if (!isMerchantSyncEnabled()) return null

  const { data } = await getClient().accounts.productInputs.insert({
    parent: `accounts/${MERCHANT_ID}`,
    dataSource: `accounts/${MERCHANT_ID}/dataSources/${DATA_SOURCE_ID}`,
    requestBody: toProductInput(product),
  })

  return data
}

export async function deleteMerchantProduct(product: Pick<Product, 'id'>) {
  if (!isMerchantSyncEnabled()) return

  try {
    await getClient().accounts.productInputs.delete({
      name: productInputName(toOfferId(product)),
      dataSource: `accounts/${MERCHANT_ID}/dataSources/${DATA_SOURCE_ID}`,
    })
  } catch (error: any) {
    // Déjà absent de Merchant Center : rien à faire.
    if (error?.code !== 404) throw error
  }
}

/**
 * Relit le produit publié (images peuplées, promo catégorie appliquée par le
 * hook afterRead) puis l'envoie à Merchant Center, ou l'en retire s'il n'est
 * plus publié.
 */
export async function syncProductToMerchant(payload: Payload, id: Product['id']) {
  if (!isMerchantSyncEnabled()) return

  const product = await payload
    .findByID({
      collection: 'products',
      id,
      depth: 1,
      draft: false,
      locale: CONTENT_LANGUAGE,
      overrideAccess: true,
    })
    .catch(() => null)

  if (!product || product._status !== 'published') {
    await deleteMerchantProduct({ id })
    return
  }

  await upsertMerchantProduct(product)
}

/** Resynchronise tout le catalogue publié (premier envoi, rattrapage nocturne). */
export async function syncAllProductsToMerchant(payload: Payload) {
  if (!isMerchantSyncEnabled()) return { synced: 0, failed: [] as string[] }

  const { docs } = await payload.find({
    collection: 'products',
    depth: 1,
    draft: false,
    locale: CONTENT_LANGUAGE,
    limit: 5000,
    pagination: false,
    overrideAccess: true,
    where: { _status: { equals: 'published' } },
  })

  const failed: string[] = []
  for (const product of docs) {
    try {
      await upsertMerchantProduct(product)
    } catch (error) {
      failed.push(String(product.id))
      payload.logger.error(`Google Merchant sync failed (product ${product.id}): ${describeMerchantError(error)}`)
    }
  }

  return { synced: docs.length - failed.length, failed }
}
