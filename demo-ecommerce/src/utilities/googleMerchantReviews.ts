import { google, type merchantapi_reviews_v1beta } from 'googleapis'
import type { Payload } from 'payload'

import type { Product, Review } from '@/payload-types'
import { BRAND, getMerchantAuth, getSiteURL } from '@/utilities/googleMerchant'

/**
 * Envoi des avis approuvés vers Google Merchant Center (programme
 * « Évaluations de produits », Merchant API reviews_v1beta).
 *
 * Variable d'environnement : GOOGLE_MERCHANT_REVIEWS_DATA_SOURCE_ID, id de la
 * source de données « Avis produits ». Sans elle l'envoi est désactivé.
 */

const MERCHANT_ID = process.env.GOOGLE_MERCHANT_ID
const REVIEWS_DATA_SOURCE_ID = process.env.GOOGLE_MERCHANT_REVIEWS_DATA_SOURCE_ID

// Même langue et même chemin que les liens produits envoyés à Merchant Center,
// pour que Google rattache l'avis à la bonne fiche.
const PRODUCT_LINK_LANGUAGE = 'fr'
const REVIEW_COUNTRY = 'TN'

export const isMerchantReviewsSyncEnabled = () => Boolean(MERCHANT_ID && REVIEWS_DATA_SOURCE_ID)

let client: merchantapi_reviews_v1beta.Merchantapi | null = null

function getClient() {
  if (client) return client
  client = google.merchantapi({ version: 'reviews_v1beta', auth: getMerchantAuth() })
  return client
}

const dataSourceName = () => `accounts/${MERCHANT_ID}/dataSources/${REVIEWS_DATA_SOURCE_ID}`

export function toMerchantReview(
  review: Review,
  product: Pick<Product, 'id' | 'slug' | 'productTitle'>,
): merchantapi_reviews_v1beta.Schema$ProductReview {
  const productLink = `${getSiteURL()}/${PRODUCT_LINK_LANGUAGE}/produit/${product.slug}`

  return {
    productReviewId: String(review.id),
    productReviewAttributes: {
      rating: review.rating,
      minRating: '1',
      maxRating: '5',
      title: review.title || undefined,
      content: review.comment,
      reviewerUsername: review.authorName,
      reviewTime: review.createdAt,
      reviewLanguage: review.locale || 'fr',
      reviewCountry: REVIEW_COUNTRY,
      reviewLink: { link: `${productLink}#avis`, type: 'SINGLETON' },
      collectionMethod: 'UNSOLICITED',
      isVerifiedPurchase: false,
      // Pas de GTIN : Google rattache l'avis au produit par son id (= offerId), son lien et sa marque.
      skus: [String(product.id)],
      productLinks: [productLink],
      productNames: [product.productTitle],
      brands: [BRAND],
    },
  }
}

export async function upsertMerchantReview(payload: Payload, review: Review) {
  if (!isMerchantReviewsSyncEnabled()) return null

  const productId = typeof review.product === 'object' ? review.product.id : review.product
  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    draft: false,
    locale: PRODUCT_LINK_LANGUAGE,
    select: { slug: true, productTitle: true },
    overrideAccess: true,
  })

  const { data } = await getClient().accounts.productReviews.insert({
    parent: `accounts/${MERCHANT_ID}`,
    dataSource: dataSourceName(),
    requestBody: toMerchantReview(review, product),
  })

  return data
}

export async function deleteMerchantReview(reviewId: Review['id']) {
  if (!isMerchantReviewsSyncEnabled()) return

  try {
    await getClient().accounts.productReviews.delete({
      name: `accounts/${MERCHANT_ID}/productReviews/${reviewId}`,
    })
  } catch (error: any) {
    // Déjà absent de Merchant Center : rien à faire.
    if (error?.code !== 404) throw error
  }
}
