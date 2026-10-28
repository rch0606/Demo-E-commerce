import type { Payload } from 'payload'

const mediaId = (media: unknown): string | null => {
  const id = media && typeof media === 'object' ? (media as { id?: unknown }).id : media
  return id == null ? null : String(id)
}

type ProductImagesLike = {
  id: string | number
  featuredImage?: unknown
  gallery?: { image?: unknown }[] | null
  meta?: { image?: unknown } | null
}

/**
 * Index des images produits :
 *  - `main`  : idProduit → id de son image principale ;
 *  - `usage` : idMedia → produits qui l'utilisent (principale, galerie ou SEO).
 */
export type ProductImageIndex = {
  main: Map<string, string>
  usage: Map<string, Set<string>>
}

export function buildProductImageIndex(products: ProductImagesLike[]): ProductImageIndex {
  const main = new Map<string, string>()
  const usage = new Map<string, Set<string>>()

  const use = (media: unknown, productId: string) => {
    const id = mediaId(media)
    if (!id) return
    const users = usage.get(id) ?? new Set<string>()
    users.add(productId)
    usage.set(id, users)
  }

  for (const product of products) {
    const productId = String(product.id)
    const featured = mediaId(product.featuredImage)
    if (featured) main.set(productId, featured)

    use(product.featuredImage, productId)
    for (const item of product.gallery ?? []) use(item?.image, productId)
    use(product.meta?.image, productId)
  }

  return { main, usage }
}

export async function getProductImageIndex(payload: Payload): Promise<ProductImageIndex> {
  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: true,
    where: { _status: { equals: 'published' } },
    select: { featuredImage: true, gallery: true, meta: true },
  })

  return buildProductImageIndex(docs as ProductImagesLike[])
}

/**
 * Photos à ne pas annoncer à Google pour `productId` : toute image qu'un AUTRE
 * produit utilise aussi (photo d'ensemble ajoutée à la galerie d'une pièce
 * vendue seule, produit dupliqué…). Seule exception : l'image principale du
 * produit lui-même, qui reste toujours annoncée. Ces photos restent affichées
 * sur le site ; Google, lui, ne reçoit que les images propres au produit.
 */
export function sharedImageIds(index: ProductImageIndex, productId: string | number): string[] {
  const id = String(productId)
  const own = index.main.get(id)
  const shared: string[] = []

  for (const [image, users] of index.usage) {
    if (image === own) continue
    if ([...users].some((user) => user !== id)) shared.push(image)
  }

  return shared
}

/** L'image fait-elle partie de la liste à ne pas annoncer pour ce produit ? */
export const isExcludedImage = (media: unknown, excludedIds: readonly string[]) => {
  const id = mediaId(media)
  return Boolean(id && excludedIds.includes(id))
}
