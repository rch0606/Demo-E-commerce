'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Media } from '@/components/Media'

interface ProductGalleryProps {
  images: {
    image: any
    colors?: string[]
  }[]
  activeIndex: number
  /** Conservé pour compatibilité : les images de la couleur choisie. */
  activeColorIndexes?: number[]
  onImageChange: (index: number) => void
  enableZoom?: boolean
  /**
   * `auto` : grille de grandes images à partir de lg, carrousel en dessous.
   * `carousel` : carrousel à toutes les tailles (fenêtre modale).
   */
  layout?: 'auto' | 'carousel'
  className?: string
}

const TILE = 'relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-brand-mist'

/** Grande image avec loupe au survol (desktop). */
function ZoomTile({
  image,
  enableZoom,
  priority,
  className,
}: {
  image: any
  enableZoom: boolean
  priority?: boolean
  className?: string
}) {
  const [zoom, setZoom] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 50 })

  return (
    <div
      className={cn(TILE, enableZoom && 'cursor-zoom-in', className)}
      onMouseEnter={() => enableZoom && setZoom(true)}
      onMouseLeave={() => {
        setZoom(false)
        setPos({ x: 50, y: 50 })
      }}
      onMouseMove={(e) => {
        if (!enableZoom || !zoom) return
        const rect = e.currentTarget.getBoundingClientRect()
        setPos({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        })
      }}
    >
      <div
        className={cn('relative h-full w-full transition-transform duration-300 ease-out', enableZoom && zoom && 'scale-[1.6]')}
        style={{ transformOrigin: `${pos.x}% ${pos.y}%` }}
      >
        <Media
          resource={image}
          fill
          size="(min-width: 1024px) 30vw, 100vw"
          className="h-full w-full"
          imgClassName="h-full w-full object-cover"
          priority={priority}
        />
      </div>
    </div>
  )
}

export function ProductGallery({
  images,
  activeIndex,
  onImageChange,
  enableZoom = true,
  layout = 'auto',
  className,
}: ProductGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const allImages = images || []
  const count = allImages.length
  const safeActiveIndex = Math.min(Math.max(activeIndex ?? 0, 0), Math.max(count - 1, 0))

  // Position du carrousel : en arabe (RTL) scrollLeft est négatif.
  const readIndex = useCallback(() => {
    const track = trackRef.current
    if (!track || !track.clientWidth) return 0
    return Math.round(Math.abs(track.scrollLeft) / track.clientWidth)
  }, [])

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const track = trackRef.current
    if (!track) return
    const rtl = getComputedStyle(track).direction === 'rtl'
    track.scrollTo({ left: (rtl ? -1 : 1) * index * track.clientWidth, behavior })
  }, [])

  // Index changé de l'extérieur (choix d'une couleur) : le carrousel suit.
  useEffect(() => {
    if (readIndex() !== safeActiveIndex) scrollToIndex(safeActiveIndex)
  }, [safeActiveIndex, readIndex, scrollToIndex])

  const scrollFrame = useRef<number | null>(null)
  const handleScroll = () => {
    if (scrollFrame.current != null) cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = requestAnimationFrame(() => {
      const index = readIndex()
      if (index !== safeActiveIndex && index < count) onImageChange(index)
    })
  }

  if (!count) {
    return (
      <div className={cn(TILE, 'flex items-center justify-center', className)}>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    )
  }

  const isCarouselOnly = layout === 'carousel'

  return (
    <div id="product-gallery" className={cn('w-full', className)}>
      {/* Carrousel plein écran, une image par vue, glissable au doigt. */}
      <div className={cn(!isCarouselOnly && 'lg:hidden')}>
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {allImages.map((item, i) => (
            <div key={i} className="w-full shrink-0 snap-start snap-always">
              <div className={TILE}>
                <Media
                  resource={item?.image}
                  fill
                  size="100vw"
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                  priority={i === 0}
                />
              </div>
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} / ${count}`}
                aria-current={i === safeActiveIndex}
                onClick={() => {
                  onImageChange(i)
                  scrollToIndex(i)
                }}
                className="flex h-6 items-center justify-center px-0.5"
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-full transition-all duration-300',
                    i === safeActiveIndex ? 'w-5 bg-foreground' : 'w-1.5 bg-foreground/20',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop : toutes les images en grand, sur deux colonnes. Avec un
          nombre impair, la première occupe toute la largeur. */}
      {!isCarouselOnly && (
        <div className="hidden grid-cols-2 gap-3 lg:grid">
          {allImages.map((item, i) => (
            <ZoomTile
              key={i}
              image={item?.image}
              enableZoom={enableZoom}
              priority={i < 2}
              className={cn((count === 1 || (count % 2 === 1 && i === 0)) && 'col-span-2')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
