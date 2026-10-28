'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Shield, Truck, CreditCard, Award } from 'lucide-react'
import { CMSLink } from '@/components/Link'
import Icon from '@/components/Icon'
import { Media } from '@/components/Media'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'

const SHOP_LABEL: Record<string, string> = { fr: 'Voir la boutique', ar: 'تصفح المتجر', en: 'Browse the shop' }

export const HomeHero: React.FC<any> = (props) => {
  const {
    badge,
    icon,
    title: mainTitle,
    description: mainDescription,
    images = [],
    cta,
    trustItems = [],
  } = props

  const { locale } = useLocale()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const totalSlides = images?.length || 0
  const hasMultipleImages = totalSlides > 1

  const currentSlide = images?.[currentIndex] || {}
  const currentTitle = currentSlide?.title || mainTitle
  const currentDescription = currentSlide?.description || mainDescription

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentIndex) return
      setIsTransitioning(true)
      setCurrentIndex(index)
      setTimeout(() => setIsTransitioning(false), 700)
    },
    [isTransitioning, currentIndex],
  )

  const goToNext = useCallback(() => {
    if (hasMultipleImages) goToSlide((currentIndex + 1) % totalSlides)
  }, [currentIndex, totalSlides, goToSlide, hasMultipleImages])

  const goToPrev = useCallback(() => {
    if (hasMultipleImages) goToSlide((currentIndex - 1 + totalSlides) % totalSlides)
  }, [currentIndex, totalSlides, goToSlide, hasMultipleImages])

  useEffect(() => {
    if (!hasMultipleImages || !isAutoPlaying) return
    const timer = setInterval(goToNext, 6000)
    return () => clearInterval(timer)
  }, [goToNext, hasMultipleImages, isAutoPlaying])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'ArrowLeft') goToPrev()
    }
    if (hasMultipleImages) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [goToNext, goToPrev, hasMultipleImages])

  const displayTrustItems = trustItems?.length > 0 ? trustItems : []

  if (!images || images.length === 0) return null

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = { Truck, Shield, CreditCard, Award }
    return icons[iconName] || null
  }

  return (
    // Hero en deux colonnes sur un panneau crème : texte à gauche, visuel arrondi à droite.
    <section className="px-3 pt-3 sm:px-4 md:pt-4">
      <div
        className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-[2rem] bg-brand-mist px-5 py-8 sm:px-8 md:grid-cols-2 md:gap-10 md:px-12 md:py-12 lg:gap-16 lg:px-16 lg:py-16"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <div className="order-2 md:order-1">
          {badge && (
            <div
              key={`badge-${currentIndex}`}
              className="mb-5 inline-flex animate-fade-in-up items-center gap-2 rounded-full bg-card px-4 py-1.5 shadow-[0_1px_2px_rgba(38,35,43,0.05)]"
            >
              {icon && <Icon name={icon} className="h-3.5 w-3.5 text-brand-pink" />}
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{badge}</span>
            </div>
          )}

          {currentTitle && (
            <h1
              key={`title-${currentIndex}`}
              className="animate-fade-in-up font-heading text-[2.1rem] font-normal leading-[1.08] tracking-tight text-foreground animation-delay-100 sm:text-5xl lg:text-[3.6rem]"
            >
              {currentTitle}
            </h1>
          )}

          {currentDescription && (
            <p
              key={`desc-${currentIndex}`}
              className="animate-fade-in-up mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground animation-delay-200 sm:text-base"
            >
              {currentDescription}
            </p>
          )}

          {cta?.link && (
            <div className="animate-fade-in-up mt-7 flex flex-wrap items-center gap-3 animation-delay-300">
              <CMSLink
                {...cta.link}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground no-underline transition-colors duration-300 hover:bg-primary/90"
              >
                {cta.link.label}
                <ArrowRight
                  strokeWidth={1.5}
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                />
              </CMSLink>
              <Link
                href={`/${locale}/boutique`}
                className="inline-flex items-center rounded-full border border-foreground/15 bg-card/60 px-6 py-3.5 text-sm font-medium text-foreground no-underline transition-colors duration-300 hover:bg-card"
              >
                {SHOP_LABEL[locale] ?? SHOP_LABEL.fr}
              </Link>
            </div>
          )}

          {displayTrustItems.length > 0 && (
            <ul className="animate-fade-in-up mt-8 grid gap-3 border-t border-foreground/10 pt-6 animation-delay-400 sm:grid-cols-3">
              {displayTrustItems.map((item: any, index: number) => {
                const IconComponent = getIconComponent(item.icon)
                return (
                  <li key={index} className="flex items-center gap-2.5 text-[13px] text-foreground/80">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-brand-pink">
                      {IconComponent ? (
                        <IconComponent strokeWidth={1.5} className="h-4 w-4" />
                      ) : (
                        <Icon name={item.icon} strokeWidth={1.5} className="h-4 w-4" />
                      )}
                    </span>
                    {item.label}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="relative order-1 md:order-2">
          <div className="relative aspect-[6/5] w-full overflow-hidden rounded-[1.75rem] bg-brand-haze">
            {images.map((slide: any, index: number) => (
              <div
                key={index}
                className={cn(
                  'absolute inset-0 transition-opacity duration-[1000ms] ease-out',
                  index === currentIndex ? 'z-[1] opacity-100' : 'z-0 opacity-0',
                )}
              >
                {slide.image && typeof slide.image === 'object' ? (
                  <Media
                    resource={slide.image}
                    fill
                    className="absolute inset-0 h-full w-full"
                    imgClassName="h-full w-full object-cover object-center"
                    size="(min-width: 768px) 50vw, 100vw"
                    priority={index === 0}
                  />
                ) : null}
              </div>
            ))}
          </div>

          {hasMultipleImages && (
            <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between">
              <div className="flex gap-1.5 rounded-full bg-card/80 px-3 py-2 backdrop-blur">
                {images.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      index === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-foreground/20 hover:bg-foreground/40',
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={goToPrev}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-card/85 text-foreground backdrop-blur transition-colors hover:bg-card"
                  aria-label="Previous slide"
                >
                  <ChevronLeft strokeWidth={1.5} className="h-4 w-4 rtl:rotate-180" />
                </button>
                <button
                  onClick={goToNext}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-card/85 text-foreground backdrop-blur transition-colors hover:bg-card"
                  aria-label="Next slide"
                >
                  <ChevronRight strokeWidth={1.5} className="h-4 w-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-300 { animation-delay: 300ms; }
        .animation-delay-400 { animation-delay: 400ms; }

      `}</style>
    </section>
  )
}