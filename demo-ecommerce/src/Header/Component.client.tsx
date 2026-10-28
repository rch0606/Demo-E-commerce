'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, Search, ShoppingBag, Heart, ChevronDown, Truck } from 'lucide-react'
import Image from 'next/image'

import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'
import type { Category, Header as HeaderType } from '@/payload-types'
import { BrandLogo } from '@/components/BrandLogo'
import { brand } from '@/brand.config'
import { Media } from '@/components/Media'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { CategoriesMegaMenu, CategoriesMobileMenu } from './CategoriesMenu'
import { CartDrawer } from '@/components/CartDrawer'
import { useCartStore } from '@/stores/cart'
import { useWishlistStore } from '@/stores/wishlist'
import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

type Props = {
  header: HeaderType
  categories: Category[]
}

// Même libellé que la fiche produit (clé `productReference` des dictionnaires).
const REFERENCE_LABEL: Record<string, string> = { fr: 'Réf.', en: 'Ref.', ar: 'المرجع' }

type SearchResult = {
  id: string
  productTitle: string
  barcode?: string | null
  slug: string
  currentPrice: number
  featuredImage?: string | { url: string }
  gallery?: Array<{ image: string | { url: string } }>
}

const ICON_STROKE = 1.5
const iconButton =
  'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
const navLink =
  "relative inline-flex h-full items-center gap-1 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-brand-pink after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100"
const navLinkActive = 'text-foreground after:scale-x-100'

export function HeaderClient({ header, categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLocale()
  const navItems = header?.navItems ?? []
  const safeCategories = categories ?? []

  const [open, setOpen] = useState(false)
  const [catsOpen, setCatsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { getTotalItemsCount, isOpen: cartStoreOpen, closeCart: closeCartStore } = useCartStore()
  const totalItemsCount = getTotalItemsCount()
  const wishlistCount = useWishlistStore((s) => s.getTotalItems())

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Get current locale from pathname
  const getLocale = () => {
    const segments = pathname?.split('/') || []
    const possibleLocale = segments[1]
    return ['en', 'fr', 'ar'].includes(possibleLocale) ? possibleLocale : 'fr'
  }

  useEffect(() => {
    const handleOpenCart = () => {
      setCartOpen(true)
    }

    window.addEventListener('open-cart-dropdown', handleOpenCart)
    return () => window.removeEventListener('open-cart-dropdown', handleOpenCart)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const trimmedQuery = searchQuery.trim()
      if (trimmedQuery.length >= 2) {
        setIsSearching(true)
        setShowDropdown(true)
        try {
          const locale = getLocale()
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}&limit=5`
          )
          const data = await response.json()
          setSearchResults(data.results || [])
        } catch (error) {
          console.error('Search error:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, pathname])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery) {
      const locale = getLocale()
      router.push(`/${locale}/search?q=${encodeURIComponent(trimmedQuery)}`)
      setSearchQuery('')
      setShowDropdown(false)
      setSearchOpen(false)
      setOpen(false)
    }
  }

  const handleResultClick = (slug: string) => {
    const locale = getLocale()
    router.push(`/${locale}/produit/${slug}`)
    setSearchQuery('')
    setShowDropdown(false)
    setSearchOpen(false)
  }

  // Helper to get product image
  const getProductImage = (product: SearchResult) => {
    if (product.featuredImage) {
      return typeof product.featuredImage === 'string'
        ? product.featuredImage
        : product.featuredImage.url
    }

    if (product.gallery && product.gallery.length > 0) {
      const firstImage = product.gallery[0]?.image
      if (firstImage) {
        return typeof firstImage === 'string' ? firstImage : firstImage.url
      }
    }

    return null
  }

  // Format price
  const formatPrice = (price: number) => {
    const locale = getLocale()
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-TN' :
                                 locale === 'en' ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency: 'TND'
    }).format(price)
  }

  // Whenever addItem(..., true) is called anywhere in the app, the store's
  // isOpen flips true — reflect that in this dropdown's own open state.
  useEffect(() => {
    if (cartStoreOpen) {
      setCartOpen(true)
      setOpen(false) // don't keep menu open under the cart
    }
  }, [cartStoreOpen])

  // Lock body scroll on mobile when the menu drawer is open (the cart drawer locks itself)
  useEffect(() => {
    if (!open) return
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    if (!isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggleCartDropdown = () => {
    const next = !cartOpen
    setCartOpen(next)
    if (next) setOpen(false) // close mobile menu when opening cart
  }

  const closeCartDropdown = useCallback(() => {
    setCartOpen(false)
    closeCartStore?.()
  }, [closeCartStore])

  const toggleMobileMenu = () => {
    const next = !open
    setOpen(next)
    if (next) {
      // close cart so menu is not hidden under the cart panel
      setCartOpen(false)
      closeCartStore?.()
    }
  }

  // Lien de navigation actif : comparaison simple du chemin courant avec l'URL du lien.
  const isActiveLink = (link: any) => {
    if (!link || !pathname) return false
    const locale = getLocale()
    let path: string | null = null
    if (link.type === 'reference' && link.reference?.value && typeof link.reference.value === 'object') {
      const slug = link.reference.value.slug
      if (!slug) return false
      path =
        link.reference.relationTo === 'pages'
          ? slug === 'home'
            ? '/'
            : `/${slug}`
          : `/${link.reference.relationTo}/${slug}`
    } else if (typeof link.url === 'string') {
      path = link.url
    }
    if (!path || /^(https?:|mailto:|tel:|#)/.test(path)) return false
    const current = pathname.replace(/\/$/, '') || '/'
    const withLocale = path.startsWith(`/${locale}`) ? path : `/${locale}${path === '/' ? '' : path}`
    const target = withLocale.replace(/\/$/, '')
    if (target === `/${locale}`) return current === target
    return current === target || current.startsWith(`${target}/`)
  }

  const logo = (
    <CMSLink
      url="/"
      className="flex h-8 shrink-0 items-center no-underline md:h-9"
      aria-label={brand.name}
    >
      {header.logo && typeof header.logo === 'object' ? (
        <Media
          resource={header.logo}
          alt={header.logo.alt || brand.name}
          className="flex h-full items-center bg-transparent"
          pictureClassName="bg-transparent"
          imgClassName="h-full w-auto max-w-[130px] object-contain bg-transparent"
          priority
        />
      ) : (
        <BrandLogo className="text-2xl md:text-[1.7rem]" />
      )}
    </CMSLink>
  )

  const searchInputClass =
    'h-11 w-full rounded-full border border-border bg-card ps-11 pe-11 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-brand-pink focus:outline-none focus:ring-4 focus:ring-brand-haze/60'

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur">
      <AnnouncementBar />

      {/* MAIN ROW — mobile : menu | logo | panier ; desktop : logo | recherche | actions */}
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 md:h-20 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-8 lg:px-8">

        {/* Mobile : menu + recherche */}
        <div className="col-start-1 row-start-1 flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className={cn(iconButton, '-ms-2')}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" strokeWidth={ICON_STROKE} /> : <Menu className="h-5 w-5" strokeWidth={ICON_STROKE} />}
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className={iconButton}
            aria-label="Rechercher"
            aria-expanded={searchOpen}
          >
            <Search className="h-5 w-5" strokeWidth={ICON_STROKE} />
          </button>
        </div>

        {/* LOGO */}
        <div className="col-start-2 row-start-1 justify-self-center md:col-start-1 md:justify-self-start">
          {logo}
        </div>

        {/* DESKTOP SEARCH — large champ centré, avec résultats */}
        <div className="relative col-start-2 row-start-1 hidden w-full max-w-xl justify-self-center md:block" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative" role="search">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={ICON_STROKE}
            />
            <input
              type="text"
              placeholder="Rechercher..."
              aria-label="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowDropdown(true)}
              className={searchInputClass}
            />
            {isSearching && (
              <div className="absolute end-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-primary border-t-transparent" />
              </div>
            )}
          </form>

          {/* Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[26rem] overflow-y-auto rounded-3xl border border-border bg-card shadow-[0_8px_30px_rgba(38,35,43,0.06)]">
              <div className="p-2">
                {searchResults.map((result) => {
                  const imageUrl = getProductImage(result)
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleResultClick(result.slug)}
                      className="flex w-full items-center gap-4 rounded-2xl p-2.5 text-start transition-colors hover:bg-muted"
                    >
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-brand-mist">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={result.productTitle}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" strokeWidth={ICON_STROKE} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-foreground">
                          {result.productTitle}
                        </p>
                        {result.barcode && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {REFERENCE_LABEL[getLocale()] || REFERENCE_LABEL.fr}{' '}
                            <span className="font-mono tracking-wider text-foreground/70" dir="ltr">
                              {result.barcode}
                            </span>
                          </p>
                        )}
                        <p className="mt-1 text-sm font-medium text-primary">
                          {formatPrice(result.currentPrice)}
                        </p>
                      </div>
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => {
                    const locale = getLocale()
                    router.push(`/${locale}/search?q=${encodeURIComponent(searchQuery)}`)
                    setShowDropdown(false)
                    setSearchQuery('')
                  }}
                  className="mt-1 w-full rounded-full border-t border-border py-3 text-center text-sm text-primary transition-colors hover:bg-muted"
                >
                  Voir tous les résultats →
                </button>
              </div>
            </div>
          )}

          {showDropdown && searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
            <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-3xl border border-border bg-card shadow-[0_8px_30px_rgba(38,35,43,0.06)]">
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Search className="mx-auto mb-2 h-7 w-7 text-muted-foreground/50" strokeWidth={ICON_STROKE} />
                Aucun produit trouvé
              </div>
            </div>
          )}
        </div>

        {/* END — favoris + panier */}
        <div className="col-start-3 row-start-1 flex items-center justify-self-end gap-1">
          {/* Wishlist icon with badge */}
          <Link
            href={`/${getLocale()}/favoris`}
            className={iconButton}
            aria-label="Mes favoris"
          >
            <Heart className="h-5 w-5" strokeWidth={ICON_STROKE} />
            {isMounted && wishlistCount > 0 && (
              <span className="absolute end-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-haze px-1 text-[10px] font-medium text-foreground ring-2 ring-background">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon with Badge - opens the slide-over drawer */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleCartDropdown}
              className={cn(iconButton, '-me-2 md:me-0', cartOpen && 'bg-muted')}
              aria-label="Panier"
              aria-expanded={cartOpen}
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={ICON_STROKE} />
              {isMounted && totalItemsCount > 0 && (
                <span className="absolute end-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground ring-2 ring-background">
                  {totalItemsCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* DESKTOP NAV ROW */}
      <div className="relative hidden border-t border-border/60 md:block">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <nav className="flex h-full items-center gap-7" aria-label="Navigation principale">
            {navItems.length > 0 &&
              navItems.map((item: any, index: number) => {
                if (item?.type === 'categories') {
                  return (
                    // Toute la hauteur de la barre : la souris passe du bouton au
                    // panneau sans quitter la zone, donc sans refermer le menu.
                    <div
                      key={item?.id || index}
                      className="flex h-full items-center"
                      onMouseEnter={() => setCatsOpen(true)}
                      onMouseLeave={() => setCatsOpen(false)}
                    >
                      <button
                        type="button"
                        aria-expanded={catsOpen}
                        onClick={() => setCatsOpen((value) => !value)}
                        className={cn(navLink, catsOpen && navLinkActive)}
                      >
                        {item?.label}
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform duration-300', catsOpen && 'rotate-180')}
                          strokeWidth={ICON_STROKE}
                        />
                      </button>

                      {catsOpen && (
                        <CategoriesMegaMenu categories={safeCategories} onNavigate={() => setCatsOpen(false)} />
                      )}
                    </div>
                  )
                }

                if (!item?.link) return null

                return (
                  <CMSLink
                    key={item?.id || index}
                    {...item?.link}
                    appearance="inline"
                    className={cn(navLink, isActiveLink(item.link) && navLinkActive)}
                  />
                )
              })}
          </nav>

          {t?.featDeliveryDesc && (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-mist px-3 py-1 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-brand-green" strokeWidth={ICON_STROKE} aria-hidden />
              {t.featDeliveryDesc}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 md:hidden',
          searchOpen ? 'max-h-20 border-t border-border/60 py-3' : 'max-h-0 py-0',
        )}
      >
        <div className="relative px-4 sm:px-6">
          <form onSubmit={handleSearchSubmit} className="relative" role="search">
            <input
              type="text"
              placeholder="Rechercher..."
              aria-label="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={searchInputClass}
            />
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={ICON_STROKE}
            />
          </form>
        </div>
      </div>
    </header>

    {/* Mobile menu — tiroir pleine hauteur depuis le côté de départ (hors du header : le
        backdrop-blur du header créerait un bloc conteneur pour les éléments fixed). */}
    <div
      className={cn('fixed inset-0 z-[90] md:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'absolute inset-y-0 start-0 flex w-[88%] max-w-sm flex-col bg-background shadow-[0_8px_30px_rgba(38,35,43,0.06)] transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <div onClick={() => setOpen(false)}>{logo}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(iconButton, '-me-2')}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <form onSubmit={handleSearchSubmit} className="relative" role="search">
            <input
              type="text"
              placeholder="Rechercher..."
              aria-label="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={searchInputClass}
              tabIndex={open ? 0 : -1}
            />
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={ICON_STROKE}
            />
          </form>

          <nav className="mt-6 flex flex-col">
            {navItems.length > 0 &&
              navItems?.map((item, index) => {
                if (item.type === 'categories') {
                  return (
                    <div key={item?.id || index} className="order-last mt-6 border-t border-border pt-5">
                      <CategoriesMobileMenu categories={safeCategories} onNavigate={() => setOpen(false)} />
                    </div>
                  )
                }

                if (!item?.link) return null

                return (
                  <div
                    key={item.id || index}
                    onClick={() => setOpen(false)}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <CMSLink
                      {...item?.link}
                      appearance="inline"
                      className={cn(
                        'block py-3 font-heading text-2xl font-normal text-foreground no-underline transition-colors hover:text-primary',
                        isActiveLink(item.link) && 'text-primary',
                      )}
                    />
                  </div>
                )
              })}
          </nav>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-brand-mist/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href={`/${getLocale()}/favoris`}
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground no-underline"
            aria-label="Mes favoris"
          >
            <Heart className="h-4 w-4" strokeWidth={ICON_STROKE} />
            {isMounted && wishlistCount > 0 ? wishlistCount : null}
          </Link>
          <button
            type="button"
            onClick={toggleCartDropdown}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground"
            aria-label="Panier"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={ICON_STROKE} />
            {isMounted && totalItemsCount > 0 ? totalItemsCount : null}
          </button>
        </div>
      </div>
    </div>

    {/* Panier latéral (slide-over) — hors du header : son backdrop-blur créerait un bloc conteneur pour fixed */}
    <CartDrawer open={cartOpen} onClose={closeCartDropdown} />
    </>
  )
}
