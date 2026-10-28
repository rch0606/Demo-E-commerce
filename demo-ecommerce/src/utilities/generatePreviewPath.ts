import { CollectionSlug } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  pages: '',
  products: '/produit',
  categories: '/categorie',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  lang?: string
}

export const generatePreviewPath = ({ collection, slug, lang}: Props) => {
  if (!slug) return null

  const encodedSlug = encodeURIComponent(slug)
  
  let path: string
  if (slug === 'home') {
    path = `/${lang}`  
  } else {
    path = `/${lang}${collectionPrefixMap[collection]}/${encodedSlug}`
  }

  const params = new URLSearchParams({
    path,
    collection,
    slug: encodedSlug,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })

  return `/next/preview?${params.toString()}`
}