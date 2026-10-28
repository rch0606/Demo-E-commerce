import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getServerSideURL } from '@/utilities/getURL'
import { buildProductImageIndex, isExcludedImage, sharedImageIds } from '@/utilities/productMainImages'

// Default locale used on the live site
const DEFAULT_LOCALE = 'fr'

// Google caps image entries at 1000 per URL; stay well under.
const MAX_IMAGES_PER_PRODUCT = 10

type ProductEntry = {
  loc: string
  lastmod: string
  images: { loc: string; title?: string }[]
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** Turns a Payload media doc into an absolute, crawlable image URL. */
const toAbsoluteImageUrl = (media: unknown, siteUrl: string): string | null => {
  if (!media || typeof media !== 'object') return null

  const url = (media as { url?: string | null }).url
  if (!url) return null

  if (url.startsWith('http://') || url.startsWith('https://')) return url

  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`
}

type PromoDates = { categories: Set<string>; excluded: Set<string>; dates: number[] }

const toId = (value: unknown): string | null => {
  const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : value
  return id == null ? null : String(id)
}

const toIds = (values: unknown): string[] =>
  Array.isArray(values) ? (values.map(toId).filter(Boolean) as string[]) : []

const toTime = (value: unknown) => {
  const time = value ? new Date(value as string).getTime() : NaN
  return Number.isNaN(time) ? 0 : time
}

/**
 * Une promotion de catégorie change le prix affiché sans toucher au produit :
 * chaque date où le prix a pu bouger (modification de la promo, début ou fin
 * déjà passés) compte dans le <lastmod> des produits concernés.
 */
const toPromoDates = (promo: any, now: number): PromoDates => ({
  categories: new Set(toIds(promo.categories)),
  excluded: new Set(toIds(promo.excludedProducts)),
  dates: [promo.updatedAt, promo.startsAt, promo.endsAt]
    .map(toTime)
    .filter((time) => time > 0 && time <= now),
})

function getLastModified(
  product: { id: unknown; updatedAt?: string | null; categories?: unknown },
  promos: PromoDates[],
): string | null {
  const productId = toId(product.id)
  const categories = toIds(product.categories)

  let latest = toTime(product.updatedAt)
  for (const promo of promos) {
    if (productId && promo.excluded.has(productId)) continue
    if (!categories.some((id) => promo.categories.has(id))) continue
    for (const time of promo.dates) latest = Math.max(latest, time)
  }

  return latest > 0 ? new Date(latest).toISOString() : null
}

const getProductsSitemap = unstable_cache(
  async (): Promise<ProductEntry[]> => {
    const payload = await getPayload({ config })
    const SITE_URL = getServerSideURL()
    const dateFallback = new Date().toISOString()
    const now = Date.now()

    const { docs: promoDocs } = await payload.find({
      collection: 'category-promos',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      select: { categories: true, excludedProducts: true, updatedAt: true, startsAt: true, endsAt: true },
    })
    const promos = promoDocs.map((promo) => toPromoDates(promo, now))

    const products = await payload.find({
      collection: 'products',
      overrideAccess: false,
      draft: false,
      // depth 1 populates the media docs so we can emit <image:loc>
      depth: 1,
      limit: 5000,
      pagination: false,
      locale: DEFAULT_LOCALE,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
        categories: true,
        productTitle: true,
        featuredImage: true,
        gallery: true,
        // Lu seulement pour savoir quels produits partagent une image.
        meta: true,
      },
    })

    // Une photo de galerie qu'un autre produit utilise aussi n'est pas
    // annoncée pour celui-ci (voir utilities/productMainImages).
    const imageIndex = buildProductImageIndex(products.docs || [])

    return (products.docs || [])
      .filter((product) => Boolean(product?.slug))
      .map((product) => {
        const title = product.productTitle || undefined
        const excluded = sharedImageIds(imageIndex, product.id)

        // L'image SEO n'est pas reprise : sur les produits dupliqués elle montre
        // souvent encore le produit d'origine. Principale + galerie suffisent.
        const candidates = [
          product.featuredImage,
          ...(Array.isArray(product.gallery)
            ? product.gallery.map((item) => item?.image).filter((image) => !isExcludedImage(image, excluded))
            : []),
        ]

        // Deduplicate: the featured image is usually repeated in the gallery.
        const seen = new Set<string>()
        const images: ProductEntry['images'] = []

        for (const candidate of candidates) {
          const loc = toAbsoluteImageUrl(candidate, SITE_URL)
          if (!loc || seen.has(loc)) continue
          seen.add(loc)
          images.push({ loc, title })
          if (images.length >= MAX_IMAGES_PER_PRODUCT) break
        }

        return {
          loc: `${SITE_URL}/${DEFAULT_LOCALE}/produit/${product.slug}`,
          lastmod: getLastModified(product, promos) || dateFallback,
          images,
        }
      })
  },
  ['products-sitemap'],
  {
    tags: ['products-sitemap'],
    // Le début ou la fin d'une promo change les prix sans aucune écriture en
    // base : on recalcule au moins une fois par heure.
    revalidate: 3600,
  },
)

const buildXml = (entries: ProductEntry[]) => {
  const urls = entries
    .map((entry) => {
      const images = entry.images
        .map(
          (image) =>
            `    <image:image><image:loc>${escapeXml(image.loc)}</image:loc>${
              image.title ? `<image:title>${escapeXml(image.title)}</image:title>` : ''
            }</image:image>`,
        )
        .join('\n')

      return [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        images,
      ]
        .filter(Boolean)
        .join('\n')
        .concat('\n  </url>')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`
}

export async function GET() {
  const entries = await getProductsSitemap()

  return new Response(buildXml(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
