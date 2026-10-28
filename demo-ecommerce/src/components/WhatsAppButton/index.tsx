'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Link as LinkIcon } from 'lucide-react'
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok } from 'react-icons/fa'
import { trackClickSocial } from '@/lib/analytics'

import { cn } from '@/lib/utils'

export type FloatingSocialLink = {
  icon?: string | null
  url: string
  label?: string
}

interface WhatsAppButtonProps {
  phoneNumber?: string
  message?: string
  /** Extra social links from footer (Instagram, Facebook, …) — shown with WhatsApp (max 3 total) */
  socialLinks?: FloatingSocialLink[]
}

function buildWaLink(phoneNumber: string, message?: string) {
  const formattedNumber = phoneNumber.replace(/[^0-9+]/g, '')
  const encodedMessage = encodeURIComponent(
    message || 'Bonjour, je vous contacte par pour obtenir plus d\'informations.',
  )
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`
}

function SocialGlyph({ name }: { name?: string | null }) {
  const key = (name || '').toLowerCase()
  if (key.includes('instagram')) return <FaInstagram className="h-5 w-5" aria-hidden />
  if (key.includes('facebook') || key === 'fb') return <FaFacebook className="h-5 w-5" aria-hidden />
  if (key.includes('tiktok')) return <FaTiktok className="h-5 w-5" aria-hidden />
  if (key.includes('whatsapp')) return <FaWhatsapp className="h-5 w-5" aria-hidden />
  return <LinkIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
}

/** All satellite buttons: coral bg + white icon */
const SATELLITE_STYLE =
  'bg-brand-pink text-white shadow-[0_4px_14px_rgba(38,35,43,0.12)] ring-2 ring-white/40'

/**
 * Arc positions around the FAB (bottom-right corner).
 * Wider angle + larger radius = more space between icons.
 */
function getArcPosition(index: number, total: number, radius = 96) {
  // Wider fan so icons don’t feel cramped
  const startDeg = total === 1 ? 135 : 95
  const endDeg = total === 1 ? 135 : 175
  const t = total === 1 ? 0 : index / (total - 1)
  const deg = startDeg + (endDeg - startDeg) * t
  const rad = (deg * Math.PI) / 180
  const x = Math.cos(rad) * radius
  const y = -Math.sin(rad) * radius
  return { x, y }
}

/**
 * Floating contact button.
 * Click → social icons bloom in an arc around the FAB (not vertical / horizontal).
 */
export function WhatsAppButton({
  phoneNumber,
  message,
  socialLinks = [],
}: WhatsAppButtonProps) {
  const [open, setOpen] = useState(false)
  // Les pages qui posent leur propre action en bas d'écran (« Ajouter au
  // panier ») demandent au bouton de s'effacer le temps qu'elle soit visible.
  const [hidden, setHidden] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const items: {
    key: string
    href: string
    label: string
    iconName: string
  }[] = []

  if (phoneNumber) {
    items.push({
      key: 'whatsapp',
      href: buildWaLink(phoneNumber, message),
      label: 'WhatsApp',
      iconName: 'whatsapp',
    })
  }

  for (const link of socialLinks) {
    if (!link?.url) continue
    if (items.length >= 3) break
    const iconName = String(link.icon || 'link')
    if (iconName.toLowerCase().includes('whatsapp') && phoneNumber) continue
    items.push({
      key: `${iconName}-${link.url}`,
      href: link.url,
      label: link.label || iconName,
      iconName,
    })
  }


  useEffect(() => {
    const onFloatingContact = (event: Event) => {
      const next = Boolean((event as CustomEvent<{ hidden?: boolean }>).detail?.hidden)
      setHidden(next)
      // Replier l'arc : il déborderait au-dessus du bloc d'achat.
      if (next) setOpen(false)
    }

    window.addEventListener('floating-contact', onFloatingContact)
    return () => window.removeEventListener('floating-contact', onFloatingContact)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!items.length) return null

  return (
    <div
      ref={rootRef}
      aria-hidden={hidden}
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 transition-all duration-300',
        hidden && 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      {/* Arc satellites around FAB center */}
      {items.map((item, index) => {
        const { x, y } = getArcPosition(index, items.length)
        return (
          <a
            key={item.key}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              trackClickSocial(item.iconName, { url: item.href })
              setOpen(false)
            }}

            className={cn(
              'absolute left-1/2 top-1/2 z-10',
              'flex h-12 w-12 items-center justify-center rounded-full',
              'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/50',
              'hover:scale-110 hover:shadow-[0_6px_18px_rgba(38,35,43,0.16)]',
              SATELLITE_STYLE,
              open
                ? 'pointer-events-auto opacity-100'
                : 'pointer-events-none opacity-0',
            )}
            style={{
              transform: open
                ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                : 'translate(-50%, -50%) scale(0.4)',
              transitionDelay: open
                ? `${index * 50}ms`
                : `${(items.length - 1 - index) * 30}ms`,
            }}
          >
            <SocialGlyph name={item.iconName} />
          </a>
        )
      })}

      {/* Main FAB */}
      <button
        type="button"
        aria-label={open ? 'Fermer le menu contact' : 'Ouvrir le menu contact'}
        aria-expanded={open}
        tabIndex={hidden ? -1 : 0}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative z-20 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-brand-pink text-white shadow-[0_6px_18px_rgba(38,35,43,0.14)]',
          'transition-all duration-300 ease-out',
          'hover:scale-105 hover:shadow-[0_8px_22px_rgba(38,35,43,0.18)]',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-pink/30',
          open && 'rotate-90 scale-95',
        )}
      >
        {!open && (
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-pink/35 opacity-40" />
        )}
        <span className="relative">
          {open ? (
            <X className="h-6 w-6" strokeWidth={2.25} />
          ) : (
            <MessageCircle className="h-6 w-6" strokeWidth={2.25} />
          )}
        </span>
      </button>
    </div>
  )
}
