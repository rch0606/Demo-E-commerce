import { brand } from '@/brand.config'
import type { Metadata } from 'next'
import { WishlistPageClient } from './page.client'

export const metadata: Metadata = {
  title: `Mes favoris | ${brand.name}`,
  description: `Retrouvez tous vos produits favoris ${brand.name} en un seul endroit.`,
  robots: { index: false, follow: false },
}

export default async function FavorisPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  await params
  return <WishlistPageClient />
}
