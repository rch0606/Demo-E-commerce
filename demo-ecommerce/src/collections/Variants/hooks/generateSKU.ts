export const generateSKUHooks = async ({
  data = {},
  req,
}: {
  data?: any
  req: any
}) => {
  if (!data?.sku && data.product && data.combination?.length) {
    const product = await req.payload.findByID({
      collection: 'products',
      id: data.product,
      overrideAccess: true,
      user: req.user,
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const { docs } = await req.payload.find({
      collection: 'attributeValues',
      where: {
        id: {
          in: data.combination,
        },
      },
      overrideAccess: true,
      user: req.user,
    })

    // fallback if slug does not exist
    const productSlug =
      product.slug ||
      product.productTitle ||
      `PRODUCT-${product.id}`

    const baseSKU = [
      String(productSlug)
        .slice(0, 6)
        .toUpperCase(),

      ...docs.map((c: any) =>
        String(c.value)
          .toUpperCase()
          .replace(/\s+/g, '')
      ),
    ].join('-')


    // Tous les SKU candidats, sans limite : avec la pagination par défaut (10),
    // le plus grand suffixe pouvait manquer et le SKU suivant entrer en doublon.
    const existing = await req.payload.find({
      collection: 'variants',
      where: {
        sku: {
          like: baseSKU,
        },
      },
      depth: 0,
      limit: 0,
      pagination: false,
      overrideAccess: true,
      req,
      select: { sku: true },
    })

    // `like` est une recherche partielle : on ne garde que « baseSKU-<nombre> ».
    const escaped = baseSKU.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const ownSuffix = new RegExp(`^${escaped}-(\\d+)$`, 'i')

    const maxSuffix = existing.docs.reduce((max: number, doc: any) => {
      const match = ownSuffix.exec(String(doc.sku ?? ''))
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)


    data.sku = `${baseSKU}-${String(maxSuffix + 1).padStart(3, '0')}`
  }

  return data
}