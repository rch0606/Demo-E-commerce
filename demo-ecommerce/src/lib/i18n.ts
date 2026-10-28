export const locales = ['en', 'fr', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

export const localeConfig = {
  en: {
    name: 'English',
    direction: 'ltr' as const,
    flag: '🇬🇧',
    shortName: 'EN',
    payloadLocale: 'en',
  },
  fr: {
    name: 'Français',
    direction: 'ltr' as const,
    flag: '🇫🇷',
    shortName: 'FR',
    payloadLocale: 'fr',
  },
  ar: {
    name: 'العربية',
    direction: 'rtl' as const,
    flag: '🇸🇦',
    shortName: 'AR',
    payloadLocale: 'ar',
  },
} satisfies Record<
  Locale,
  {
    name: string
    direction: 'ltr' | 'rtl'
    flag: string
    shortName: string
    payloadLocale: string
  }
>

export type Dictionary = typeof import('@/dictionnaries/fr').default