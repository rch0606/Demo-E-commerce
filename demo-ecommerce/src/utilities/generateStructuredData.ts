import { brand } from '@/brand.config'
import type { Category, Product } from '@/payload-types'
import { getProductPromoPercentage, getPromoPricing } from '@/lib/categoryPromo'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * Données structurées schema.org (JSON-LD) pour Google.
 * Chaque fonction renvoie un objet à sérialiser dans une balise
 * <script type="application/ld+json"> du composant ou du bloc concerné.
 * Les URLs sont toujours absolues et pointent vers le site public, même en
 * local, pour que les tests (Rich Results Test) reflètent la production.
 */

export const BRAND_NAME = brand.name
const PUBLIC_SITE_URL = brand.siteUrl
const CURRENCY = 'TND'
const COUNTRY = 'TN'

type Locale = 'fr' | 'ar' | 'en'
type JsonLdObject = Record<string, unknown>

/** Libellé du premier niveau du fil d'Ariane. */
export const BREADCRUMB_HOME: Record<Locale, string> = { fr: 'Accueil', ar: 'الرئيسية', en: 'Home' }

const LANGUAGE_TAGS: Record<Locale, string> = { fr: 'fr-TN', ar: 'ar-TN', en: 'en' }

export function getSiteURL() {
  const url = getServerSideURL().replace(/\/$/, '')
  return /localhost|127\.0\.0\.1/.test(url) ? PUBLIC_SITE_URL : url
}

export const absoluteURL = (path: string) =>
  /^https?:\/\//.test(path) ? path : `${getSiteURL()}${path.startsWith('/') ? path : `/${path}`}`

/** Valeur localisée : chaîne directe (requête avec `locale`) ou objet { fr, ar, en }. */
export function localized(value: unknown, locale: Locale = 'fr'): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const map = value as Record<string, unknown>
    const text = map[locale] ?? map.fr ?? Object.values(map)[0]
    return typeof text === 'string' ? text : ''
  }
  return ''
}

const clean = (text: string, maxLength = 5000) => text.replace(/\s+/g, ' ').trim().slice(0, maxLength)

const mediaURL = (media: unknown): string | null => {
  if (!media || typeof media !== 'object') return null
  const url = (media as { url?: string | null }).url
  return url ? absoluteURL(url) : null
}

export const productURL = (product: Pick<Product, 'slug' | 'id'>, locale: Locale) =>
  absoluteURL(`/${locale}/produit/${localized(product.slug, locale) || product.id}`)

export const categoryURL = (category: Pick<Category, 'slug' | 'id'>, locale: Locale) =>
  absoluteURL(`/${locale}/categorie/${localized(category.slug, locale) || category.id}`)

const mediaId = (media: unknown): string | null => {
  const id = media && typeof media === 'object' ? (media as { id?: unknown }).id : media
  return id == null ? null : String(id)
}

/**
 * Images du produit : principale + galerie, sans doublon. Les photos de la
 * galerie qui sont l'image principale d'un autre produit (excludeImageIds,
 * voir utilities/productMainImages) ne sont pas annoncées : Google
 * associerait sinon la photo d'un autre produit à ce résultat.
 */
export function productImages(product: Product, excludeImageIds: readonly string[] = []): string[] {
  const excluded = new Set(excludeImageIds)
  const gallery = (product.gallery ?? [])
    .map((item) => item?.image)
    .filter((image) => {
      const id = mediaId(image)
      return !id || !excluded.has(id)
    })

  const urls = [mediaURL(product.featuredImage), ...gallery.map(mediaURL)].filter((url): url is string => Boolean(url))
  return [...new Set(urls)]
}

// ---------------------------------------------------------------------------
// Site
// ---------------------------------------------------------------------------

export function generateOrganizationSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${getSiteURL()}/#organization`,
    name: BRAND_NAME,
    url: getSiteURL(),
    logo: absoluteURL(brand.icon),
    image: absoluteURL(brand.logo),
    address: { '@type': 'PostalAddress', addressCountry: COUNTRY },
    areaServed: { '@type': 'Country', name: 'Tunisia' },
    currenciesAccepted: CURRENCY,
    paymentAccepted: 'Cash on delivery',
  }
}

export function generateWebsiteSchema(locale: Locale): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getSiteURL()}/#website`,
    name: BRAND_NAME,
    url: absoluteURL(`/${locale}`),
    inLanguage: LANGUAGE_TAGS[locale],
    publisher: { '@id': `${getSiteURL()}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: absoluteURL(`/${locale}/search?q={search_term_string}`) },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteURL(item.url),
    })),
  }
}

// ---------------------------------------------------------------------------
// Produits
// ---------------------------------------------------------------------------

type ReviewLike = { rating: number; comment: string; authorName: string; createdAt: string; title?: string | null }

/**
 * Fiche produit complète : c'est ce bloc qui dit à Google quel produit la page
 * présente (nom, description, image, prix, stock, note), indépendamment des
 * autres produits affichés plus bas.
 */
export function generateProductSchema(
  product: Product,
  locale: Locale,
  options: { reviews?: ReviewLike[]; excludeImageIds?: readonly string[] } = {},
): JsonLdObject {
  const name = clean(localized(product.productTitle, locale), 150)
  const description = clean(localized(product.description, locale) || localized(product.meta?.description, locale) || name)
  const url = productURL(product, locale)
  const { price } = getPromoPricing(product.currentPrice ?? 0, product.oldPrice, getProductPromoPercentage(product))
  const inStock = (Number(product.totalStock) || 0) > 0
  const category = product.categories?.find((item): item is Category => typeof item === 'object' && item !== null)

  const schema: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name,
    description,
    url,
    image: productImages(product, options.excludeImageIds),
    sku: String(product.id),
    brand: { '@type': 'Brand', name: BRAND_NAME },
    ...(category ? { category: localized(category.title, locale) } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: CURRENCY,
      price: Number(price.toFixed(3)),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${getSiteURL()}/#organization` },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: COUNTRY },
      },
    },
  }

  const reviewCount = Number(product.reviewCount) || 0
  if (reviewCount > 0 && product.averageRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  if (options.reviews?.length) {
    schema.review = options.reviews.map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.authorName },
      datePublished: review.createdAt.slice(0, 10),
      ...(review.title ? { name: review.title } : {}),
      reviewBody: clean(review.comment, 1000),
      reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    }))
  }

  return schema
}

/**
 * Liste de produits (accueil, boutique, catégorie). Volontairement légère :
 * seulement l'URL et le nom de chaque produit, pour que Google ne mélange pas
 * les descriptions des produits d'une même page.
 */
export function generateProductListSchema(products: Product[], locale: Locale, name?: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(name ? { name } : {}),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: productURL(product, locale),
      name: clean(localized(product.productTitle, locale), 150),
    })),
  }
}

// ---------------------------------------------------------------------------
// Catégories
// ---------------------------------------------------------------------------

export function generateCategoryListSchema(categories: Category[], locale: Locale, name?: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(name ? { name } : {}),
    numberOfItems: categories.length,
    itemListElement: categories.map((category, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: categoryURL(category, locale),
      name: localized(category.title, locale),
    })),
  }
}

export function generateCollectionPageSchema(
  page: { name: string; description?: string | null; url: string },
  products: Product[],
  locale: Locale,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    ...(page.description ? { description: clean(page.description, 500) } : {}),
    url: absoluteURL(page.url),
    inLanguage: LANGUAGE_TAGS[locale],
    isPartOf: { '@id': `${getSiteURL()}/#website` },
    mainEntity: generateProductListSchema(products, locale),
  }
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export function generateFAQSchema(items: { question?: string | null; answer?: string | null }[]): JsonLdObject | null {
  const entries = items.filter((item) => item?.question && item?.answer)
  if (!entries.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((item) => ({
      '@type': 'Question',
      name: clean(item.question as string, 300),
      acceptedAnswer: { '@type': 'Answer', text: clean(item.answer as string, 2000) },
    })),
  }
}
