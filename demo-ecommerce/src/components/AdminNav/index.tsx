import type { Payload, SanitizedPermissions, TypedUser } from 'payload'
import { getTranslation, type I18nClient } from '@payloadcms/translations'
import { getVisibleEntities } from '@payloadcms/ui/shared'

import { AdminSideNav, type AdminSideNavItem } from './AdminSideNav'

type Props = {
  payload: Payload
  permissions?: SanitizedPermissions
  user?: TypedUser | null
  i18n: I18nClient
}

/** Libellés plus parlants que ceux des collections, là où c'est utile. */
const LABEL_OVERRIDES: Record<string, string> = {
  'chiffre-affaire': "Chiffre d'affaires",
  visits: 'Analytics',
}

/**
 * Menu latéral de l'admin. Il remplace l'affichage des liens par défaut de Payload
 * mais en reprend exactement la logique de visibilité (`admin.hidden` selon le
 * rôle + permission de lecture) : chaque rôle voit les mêmes entrées qu'avant.
 */
export default async function AdminNav({ payload, permissions, user, i18n }: Props) {
  if (!payload?.config || !user) return null

  const visible = getVisibleEntities({ req: { payload, user } as any })

  const items: AdminSideNavItem[] = []

  for (const collection of payload.config.collections) {
    if (!visible.collections.includes(collection.slug)) continue
    if (!permissions?.collections?.[collection.slug]?.read) continue

    const plural = collection.labels?.plural
    items.push({
      slug: collection.slug,
      href: `/admin/collections/${collection.slug}`,
      label:
        LABEL_OVERRIDES[collection.slug] ??
        (typeof plural === 'function' ? plural({ i18n, t: i18n.t } as any) : getTranslation(plural, i18n)),
    })
  }

  for (const global of payload.config.globals) {
    if (!visible.globals.includes(global.slug)) continue
    if (!permissions?.globals?.[global.slug]?.read) continue

    const label = global.label
    items.push({
      slug: global.slug,
      href: `/admin/globals/${global.slug}`,
      label:
        LABEL_OVERRIDES[global.slug] ??
        (typeof label === 'function' ? label({ i18n, t: i18n.t } as any) : getTranslation(label, i18n)),
    })
  }

  // Petits compteurs « à traiter » à côté des liens concernés.
  const badges: Record<string, number> = {}
  const count = async (slug: 'orders' | 'reviews', where: any) => {
    if (!items.some((item) => item.slug === slug)) return
    try {
      const { totalDocs } = await payload.count({ collection: slug, where, user, overrideAccess: false })
      if (totalDocs > 0) badges[slug] = totalDocs
    } catch {
      // Un compteur indisponible ne doit jamais casser le menu.
    }
  }
  await Promise.all([
    count('orders', { status: { equals: 'new' } }),
    count('reviews', { status: { equals: 'pending' } }),
  ])

  const role = (user as { role?: string }).role
  const showDashboard = role === 'owner' || role === 'admin' || role === 'sales'

  return <AdminSideNav items={items} badges={badges} showDashboard={showDashboard} />
}
