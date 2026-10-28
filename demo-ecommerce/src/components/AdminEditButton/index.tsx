'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Pencil } from 'lucide-react'

type Target = { collection: 'products' | 'categories' | 'pages'; slug: string } | null

/**
 * Déduit, à partir de l'URL du site, le document à ouvrir dans l'admin.
 * /fr/produit/<slug> → produit, /fr/categorie/<slug> → catégorie,
 * /fr ou /fr/<slug> → page (la page d'accueil a le slug « home »).
 */
function getTarget(segments: string[]): Target {
  const [, section, slug] = segments
  if (section === 'produit' && slug) return { collection: 'products', slug }
  if (section === 'categorie' && slug) return { collection: 'categories', slug }
  if (!section) return { collection: 'pages', slug: 'home' }
  if (segments.length === 2) return { collection: 'pages', slug: section }
  return null
}

/**
 * Bouton flottant « Modifier » réservé aux utilisateurs connectés à l'admin.
 * Les visiteurs ne voient rien : /api/users/me répond sans utilisateur.
 */
export function AdminEditButton() {
  const pathname = usePathname() ?? '/'
  const [isAdmin, setIsAdmin] = useState(false)
  const [href, setHref] = useState('/admin')

  useEffect(() => {
    let cancelled = false
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setIsAdmin(Boolean(data?.user?.id))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return

    const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const locale = segments[0] || 'fr'
    const target = getTarget(segments)

    setHref('/admin')
    if (!target) return

    let cancelled = false
    const params = new URLSearchParams({
      'where[slug][equals]': target.slug,
      limit: '1',
      depth: '0',
      draft: 'true',
      'select[slug]': 'true',
    })

    fetch(`/api/${target.collection}?${params}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const id = data?.docs?.[0]?.id
        if (!cancelled && id) setHref(`/admin/collections/${target.collection}/${id}?locale=${locale}`)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isAdmin, pathname])

  if (!isAdmin) return null

  return (
    <a
      href={href}
      className="fixed bottom-6 left-6 z-50 inline-flex items-center gap-2 rounded-full bg-brand-purple px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
      title="Ouvrir cette page dans l'admin"
    >
      <Pencil className="h-4 w-4" aria-hidden />
      Modifier
    </a>
  )
}

export default AdminEditButton
