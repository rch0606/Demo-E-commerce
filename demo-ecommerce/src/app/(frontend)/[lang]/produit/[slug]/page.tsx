import { brand } from '@/brand.config'
import type { Metadata } from 'next'
import { notFound, unstable_rethrow } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import type { Product, Category } from '@/payload-types'
import { ProductContent } from '@/components/ProductContent'
import type { ProductReviewsPage } from '@/components/ProductReviews'
import { getServerSideURL } from '@/utilities/getURL'
import { IN_STOCK_WHERE } from '@/lib/productVisibility'
import { getProductImageIndex, sharedImageIds } from '@/utilities/productMainImages'

const SUPPORTED_LOCALES = ['en', 'fr', 'ar'] as const
type Locale = typeof SUPPORTED_LOCALES[number]

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ lang: string; slug: string }> 
}

const fetchProduct = async (slug: string, locale?: string): Promise<Product | null> => {
  try {
    if (!slug) {
      return null
    }

    const { isEnabled: draft } = await draftMode()
    const payload = await getPayload({ config: configPromise })
    
    const result = await payload.find({
      collection: 'products',
      draft,
      limit: 1,
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 3, 
      pagination: false,
      overrideAccess: draft,
      where: {
        slug: { equals: slug } 
      },
    })

    const product = result.docs?.[0] as Product | undefined
    
    if (!product) return null

  const variants = await payload.find({
  collection: 'variants',
  where: {
    product: {
      equals: product.id,
    },
  },
  depth: 0,
  limit: 100,
})

// console.log(
//   "FIRST VARIANT:",
//   JSON.stringify(variants.docs[0], null, 2)
// )











    
    // ============================================================
    // Populate attributes
    // ============================================================
    // if (product.attributes && product.attributes.length > 0) {
    //   product.attributes = await Promise.all(
    //     (product.attributes || []).map(async (attr: any) => {
    //       const attrId = typeof attr === 'object' && attr !== null ? attr.id : attr
    //       if (!attrId) return attr

    //       // Fetch attribute values directly from the database
    //       const valuesResult = await payload.find({
    //         collection: 'attributeValues',
    //         where: {
    //           'attribute.id': {
    //             equals: attrId,
    //           },
    //         },
    //         depth: 1,
    //         locale: locale as any,
    //         fallbackLocale: 'fr',
    //         limit: 100,
    //       })

    //       const populatedValues = valuesResult.docs

    //       const attrDoc = typeof attr === 'object' && attr !== null ? attr : await payload.findByID({
    //         collection: 'attributes',
    //         id: attrId,
    //         depth: 1,
    //         locale: locale as any,
    //         fallbackLocale: 'fr',
    //       })

    //       return {
    //         ...attrDoc,
    //         values: {
    //           docs: populatedValues,
    //           hasNextPage: false,
    //         },
    //       }
    //     }),
    //   )
    // }

    // ============================================================
    // Populate variant combinations, attributes, AND images (ALWAYS)
    // ============================================================
    const populatedVariants = await Promise.all(
      variants.docs.map(async (variant: any) => {
        let updatedVariant = { ...variant }

        // 1. Populate combination (attribute values)
        if (variant.combination && variant.combination.length > 0) {
          const populatedCombination = await Promise.all(
            variant.combination.map(async (valueVal: any) => {
              const id =
                typeof valueVal === 'object' && valueVal !== null
                  ? valueVal.id
                  : valueVal

              if (!id) return null

              try {
                const result = await payload.find({
                  collection: 'attributeValues',
                  where: {
                    id: {
                      equals: id,
                    },
                  },
                  limit: 1,
                  depth: 1,
                  locale: locale as any,
                  fallbackLocale: 'fr',
                })

                return result.docs[0] || null
              } catch (error) {
                console.error(`Missing attribute value ${id}`)
                return null
              }
            }),
          )

          updatedVariant.combination = populatedCombination.filter(Boolean)
        }

        // 2. Populate attributes
        if (
          variant.attributes &&
          Array.isArray(variant.attributes) &&
          variant.attributes.length > 0
        ) {
          const populatedAttributes = await Promise.all(
            variant.attributes.map(async (attrVal: any) => {
              const id =
                typeof attrVal === 'object' && attrVal !== null
                  ? attrVal.id
                  : attrVal

              if (!id) return null

              try {
                const result = await payload.find({
                  collection: 'attributes',
                  where: {
                    id: {
                      equals: id,
                    },
                  },
                  limit: 1,
                  depth: 1,
                  locale: locale as any,
                  fallbackLocale: 'fr',
                })

                return result.docs[0] || null
              } catch (error) {
                console.error(`Failed to fetch attribute ${id}:`, error)
                return typeof attrVal === 'object' ? attrVal : null
              }
            }),
          )

          updatedVariant.attributes = populatedAttributes.filter(Boolean)
        }

        // 3. Populate images
        if (
          variant.images &&
          Array.isArray(variant.images) &&
          variant.images.length > 0
        ) {
          const populatedImages = await Promise.all(
            variant.images.map(async (imageItem: any) => {
              const imageVal = imageItem.image

              if (!imageVal) return null

              const id =
                typeof imageVal === 'object' && imageVal !== null
                  ? imageVal.id
                  : imageVal

              if (!id) return null

              try {
                const result = await payload.find({
                  collection: 'media',
                  where: {
                    id: {
                      equals: id,
                    },
                  },
                  limit: 1,
                  depth: 1,
                })

                const media = result.docs[0]

                if (!media) return null

                return {
                  image: media,
                }
              } catch (error) {
                console.error(`Failed to fetch media ${id}:`, error)
                return typeof imageVal === 'object'
                  ? { image: imageVal }
                  : null
              }
            }),
          )

          updatedVariant.images = populatedImages.filter(Boolean)
        }

        return updatedVariant
      }),
    )

    // Attach variants manually to the product (always)
    ;(product as any).variants = {
      docs: populatedVariants,
    }

    return product
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
}

const fetchRelatedProducts = async (product: Product, locale?: string): Promise<Product[]> => {
  try {
    const selectedRelated = (product.relatedProducts || [])
      .filter((related): related is Product => typeof related === 'object' && related !== null)
      .filter((related) => related.id !== product.id && related._status === 'published')

    if (selectedRelated.length) return selectedRelated.slice(0, 4)

    const categoryIds = (product.categories || [])
      .map((cat) => typeof cat === 'object' ? (cat as Category).id : cat)
      .filter(Boolean) as string[]

    if (!categoryIds || categoryIds.length === 0) {
      return []
    }

    const { isEnabled: draft } = await draftMode()
    const payload = await getPayload({ config: configPromise })

    const result = await payload.find({
      collection: 'products',
      draft,
      locale: locale as any,
      fallbackLocale: 'fr',
      depth: 3,
      limit: 4,
      pagination: false,
      overrideAccess: draft,
      where: {
        and: [
          { id: { not_equals: product.id } },
          { categories: { in: categoryIds } },
          { _status: { equals: 'published' } },
          IN_STOCK_WHERE,
        ],
      },
    })

    return result.docs as Product[]
  } catch (error) {
    console.error('Error fetching related products:', error)
    return []
  }
}

/** Photos de galerie à ne pas annoncer à Google : celles qu'un autre produit utilise aussi. */
async function fetchSeoExcludedImageIds(productId: string): Promise<string[]> {
  try {
    const payload = await getPayload({ config: configPromise })
    return sharedImageIds(await getProductImageIndex(payload), productId)
  } catch (error) {
    console.error('Error fetching product main images:', error)
    return []
  }
}

/** Premiers avis approuvés du produit ; la suite se charge côté client. */
async function fetchReviews(productId: string): Promise<ProductReviewsPage> {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'reviews',
      where: { and: [{ product: { equals: productId } }, { status: { equals: 'approved' } }] },
      sort: '-createdAt',
      limit: 5,
      depth: 0,
      select: { rating: true, title: true, comment: true, authorName: true, createdAt: true },
      overrideAccess: true,
    })
    return { docs: result.docs, totalDocs: result.totalDocs }
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return { docs: [], totalDocs: 0 }
  }
}

export default async function ProductPage({ params }: PageProps) {
  try {
    let resolvedParams
    try {
      resolvedParams = await params
    } catch (error) {
      console.error('Error resolving params:', error)
      resolvedParams = { slug: '', lang: 'fr' }
    }

    if (!resolvedParams) {
      resolvedParams = { slug: '', lang: 'fr' }
    }

    const { slug, lang } = resolvedParams

    if (!slug) {
      notFound()
    }

    const locale = isValidLocale(lang) ? lang : 'fr'
    const product = await fetchProduct(slug, locale)
    
    if (!product) notFound()

    const [related, reviews, seoExcludedImageIds] = await Promise.all([
      fetchRelatedProducts(product, locale),
      fetchReviews(String(product.id)),
      fetchSeoExcludedImageIds(String(product.id)),
    ])


    return (
      <div className="flex min-h-dvh flex-col">
        <ProductContent
          product={product}
          related={related}
          reviews={reviews}
          seoExcludedImageIds={seoExcludedImageIds}
        />
      </div>
    )
  } catch (error) {
    // Laisse passer notFound() : un produit inconnu doit répondre 404, pas 200.
    unstable_rethrow(error)
    console.error('Error rendering product page:', error)
    return (
      <div className="flex min-h-dvh flex-col">
        <main className="flex-1">
          <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
            <p className="text-muted-foreground">Nous n'avons pas trouvé le produit demandé</p>
          </div>
        </main>
      </div>
    )
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    let resolvedParams
    try {
      resolvedParams = await params
    } catch (error) {
      console.error('Error resolving params for metadata:', error)
      resolvedParams = { slug: '', lang: 'fr' }
    }

    if (!resolvedParams) {
      resolvedParams = { slug: '', lang: 'fr' }
    }

    const { slug, lang } = resolvedParams

    if (!slug) {
      return {
        title: 'Produit introuvable',
        robots: { index: false, follow: true },
      }
    }

    const locale = isValidLocale(lang) ? lang : 'fr'
    const product = await fetchProduct(slug, locale) 

    if (!product) {
      return {
        title: 'Produit introuvable',
        robots: { index: false, follow: true },
      }
    }

    const title = product.meta?.title || product.productTitle || ''
    const description = product.meta?.description || product.description || ''

    // Une seule URL officielle par langue : sans elle, Google peut retenir une
    // variante (paramètres, autre langue) et en tirer la mauvaise image.
    const siteUrl = getServerSideURL().replace(/\/$/, '')
    const pathFor = (l: Locale) => `/${l}/produit/${product.slug}`
    const canonical = `${siteUrl}${pathFor(locale)}`

    // L'image SEO peut être restée celle d'un produit dupliqué : l'image
    // principale du produit fait foi, l'image SEO ne sert qu'en secours.
    const image = toAbsoluteMediaUrl(product.featuredImage, siteUrl) ?? toAbsoluteMediaUrl(product.meta?.image, siteUrl)

    return {
      title,
      description,
      alternates: {
        canonical,
        languages: {
          ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, `${siteUrl}${pathFor(l)}`])),
          'x-default': `${siteUrl}${pathFor('fr')}`,
        },
      },
      openGraph: {
        type: 'website',
        url: canonical,
        siteName: brand.name,
        title,
        description,
        locale: OG_LOCALES[locale],
        ...(image ? { images: [{ url: image, alt: product.productTitle || title }] } : {}),
      },
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Product',
      description: 'Product description',
    }
  }
}

const OG_LOCALES: Record<Locale, string> = { fr: 'fr_TN', ar: 'ar_TN', en: 'en_US' }

/** URL absolue d'un média Payload (les URL relatives ne sont pas lues par les réseaux sociaux). */
function toAbsoluteMediaUrl(media: unknown, siteUrl: string): string | null {
  const url = media && typeof media === 'object' ? (media as { url?: string | null }).url : null
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  return `${siteUrl}${url.startsWith('/') ? url : `/${url}`}`
}

function isValidLocale(lang?: string): lang is Locale {
  return lang ? SUPPORTED_LOCALES.includes(lang as Locale) : false
}