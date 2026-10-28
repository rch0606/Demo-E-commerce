import { Snowflake, Sparkles, Sun, type LucideIcon } from 'lucide-react'

/**
 * Ambiance des collections saisonnières, dans la charte Panço : l'été en or et
 * rose, l'hiver en violet, les autres collections en rose et violet.
 * Partagée par le bloc d'accueil et le menu Catégories du header.
 */
export type SeasonMood = {
  background: string
  glow: string
  icon: LucideIcon
  tint: string
  button: string
}

const MOODS: Record<'warm' | 'cool' | 'pink', SeasonMood> = {
  warm: {
    background: 'bg-gradient-to-br from-brand-gold/25 via-brand-pink/10 to-brand-pink/20',
    glow: 'bg-brand-gold/40',
    icon: Sun,
    tint: 'text-brand-pink',
    button: 'bg-brand-pink hover:opacity-90',
  },
  cool: {
    background: 'bg-gradient-to-br from-brand-purple/20 via-brand-purple/5 to-brand-purple/25',
    glow: 'bg-brand-purple/30',
    icon: Snowflake,
    tint: 'text-brand-purple',
    button: 'bg-brand-purple hover:opacity-90',
  },
  pink: {
    background: 'bg-gradient-to-br from-brand-pink/15 via-background to-brand-purple/20',
    glow: 'bg-brand-pink/30',
    icon: Sparkles,
    tint: 'text-brand-pink',
    button: 'bg-brand-pink hover:opacity-90',
  },
}

/** Catégorie traitée comme collection (Type « Collection », ou Été / Hiver par défaut). */
export function isCollectionCategory(category: unknown): boolean {
  if (!category || typeof category !== 'object') return false
  const { kind, slug } = category as { kind?: string | null; slug?: unknown }
  if (kind === 'collection') return true
  if (kind === 'age') return false
  return slug === 'ete' || slug === 'hiver'
}

/** L'ambiance suit le slug de la catégorie : `ete` → chaud, `hiver` → froid. */
export function seasonMood(category: unknown): SeasonMood {
  const slug = category && typeof category === 'object' ? String((category as { slug?: unknown }).slug ?? '') : ''
  if (slug === 'ete') return MOODS.warm
  if (slug === 'hiver') return MOODS.cool
  return MOODS.pink
}
