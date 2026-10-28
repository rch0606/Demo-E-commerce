'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  Activity,
  ArrowLeftRight,
  BadgePercent,
  ChartColumn,
  ChevronDown,
  Circle,
  FileText,
  FolderTree,
  Image,
  Layers,
  LayoutDashboard,
  PanelBottom,
  PanelTop,
  Search,
  Settings,
  Shirt,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Tag,
  TicketPercent,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { useNav } from '@payloadcms/ui'

export type AdminSideNavItem = { slug: string; href: string; label: string }

type Icon = ComponentType<{ size?: number; strokeWidth?: number }>

/** Organisation du menu : sections dans l'ordre, liens dans l'ordre. */
const SECTIONS: { key: string; label: string; slugs: string[] }[] = [
  { key: 'pilotage', label: 'Pilotage', slugs: ['chiffre-affaire', 'visits'] },
  {
    key: 'ventes',
    label: 'Ventes',
    slugs: ['orders', 'customers', 'reviews', 'promo-codes', 'category-promos'],
  },
  { key: 'catalogue', label: 'Catalogue', slugs: ['products', 'variants', 'categories', 'attributes', 'tags'] },
  { key: 'stock', label: 'Stock', slugs: ['inventory-movements'] },
  { key: 'contenu', label: 'Contenu & SEO', slugs: ['pages', 'media', 'header', 'footer'] },
  { key: 'reglages', label: 'Réglages', slugs: ['shop-settings', 'users'] },
]

const ICONS: Record<string, Icon> = {
  'chiffre-affaire': ChartColumn,
  visits: Activity,
  orders: ShoppingBag,
  customers: Users,
  reviews: Star,
  'promo-codes': TicketPercent,
  'category-promos': BadgePercent,
  products: Shirt,
  variants: Layers,
  categories: FolderTree,
  attributes: SlidersHorizontal,
  tags: Tag,
  'inventory-movements': ArrowLeftRight,
  pages: FileText,
  media: Image,
  header: PanelTop,
  footer: PanelBottom,
  'shop-settings': Settings,
  users: UserCog,
}

const STORAGE_KEY = 'admin-nav-collapsed'

export function AdminSideNav({
  items,
  badges,
  showDashboard,
}: {
  items: AdminSideNavItem[]
  badges: Record<string, number>
  showDashboard: boolean
}) {
  const pathname = usePathname() ?? ''
  const { setNavOpen } = useNav()
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      setCollapsed(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))
    } catch {
      // Préférence illisible : toutes les sections restent ouvertes.
    }
  }, [])

  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = { ...current, [key]: !current[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Stockage indisponible (navigation privée) : on garde l'état en mémoire.
      }
      return next
    })

  // Tout lien visible mais absent de SECTIONS atterrit dans « Autres ».
  const sections = useMemo(() => {
    const bySlug = new Map(items.map((item) => [item.slug, item]))
    const placed = new Set<string>()
    const built = SECTIONS.map((section) => ({
      ...section,
      items: section.slugs.flatMap((slug) => {
        const item = bySlug.get(slug)
        if (!item) return []
        placed.add(slug)
        return [item]
      }),
    }))
    const others = items.filter((item) => !placed.has(item.slug))
    if (others.length) built.push({ key: 'autres', label: 'Autres', slugs: [], items: others })
    return built
  }, [items])

  const search = query.trim().toLowerCase()
  const isSearching = search.length > 0

  const closeOnSmallScreen = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) setNavOpen(false)
  }

  const renderLink = (href: string, label: string, IconComponent: Icon, slug: string, exact = false) => {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
    const badge = badges[slug]
    return (
      <Link
        key={slug}
        href={href}
        onClick={closeOnSmallScreen}
        className={`pnav__link${active ? ' pnav__link--active' : ''}`}
        aria-current={active ? 'page' : undefined}
        data-section-link={slug}
      >
        <span className="pnav__icon">
          <IconComponent size={17} strokeWidth={2} />
        </span>
        <span className="pnav__label">{label}</span>
        {badge ? (
          <span className="pnav__badge" title={`${badge} à traiter`}>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <div className="pnav">
      <label className="pnav__search">
        <Search size={15} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un menu…"
          aria-label="Rechercher un menu"
        />
        {isSearching && (
          <button type="button" className="pnav__search-clear" onClick={() => setQuery('')} aria-label="Effacer">
            <X size={14} />
          </button>
        )}
      </label>

      {showDashboard && !isSearching && (
        <div className="pnav__home">{renderLink('/admin', 'Tableau de bord', LayoutDashboard, 'dashboard', true)}</div>
      )}

      {sections.map((section) => {
        const links = isSearching
          ? section.items.filter((item) => item.label.toLowerCase().includes(search))
          : section.items
        if (!links.length) return null

        const isOpen = isSearching || !collapsed[section.key]
        return (
          <section key={section.key} className={`pnav__section pnav__section--${section.key}`}>
            <button
              type="button"
              className="pnav__section-toggle"
              onClick={() => toggle(section.key)}
              aria-expanded={isOpen}
            >
              <span>{section.label}</span>
              <ChevronDown size={14} className="pnav__chevron" aria-hidden />
            </button>
            {isOpen && (
              <div className="pnav__links">
                {links.map((item) => renderLink(item.href, item.label, ICONS[item.slug] ?? Circle, item.slug))}
              </div>
            )}
          </section>
        )
      })}

      {isSearching && sections.every((section) => !section.items.some((item) => item.label.toLowerCase().includes(search))) && (
        <p className="pnav__empty">Aucun menu ne correspond.</p>
      )}
    </div>
  )
}
