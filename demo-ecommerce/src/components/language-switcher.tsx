'use client'

import { useLocale } from '@/lib/locale-context'
import { cn } from '@/lib/utils'
import { usePathname, useRouter } from 'next/navigation'
import { locales } from '@/lib/i18n'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  const handleLanguageChange = (newLocale: string) => {
    const pathSegments = pathname.split('/').filter(Boolean)

    const hasLocale =
      pathSegments.length > 0 &&
      locales.includes(pathSegments[0] as any)

    const newPath = hasLocale
      ? `/${newLocale}/${pathSegments.slice(1).join('/')}`.replace(/\/$/, '')
      : `/${newLocale}${pathname === '/' ? '' : pathname}`

    router.push(newPath)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-secondary p-0.5 text-sm',
        className,
      )}
      role="group"
      aria-label="Language switcher"
    >
      <button
        type="button"
        onClick={() => handleLanguageChange('fr')}
        aria-pressed={locale === 'fr'}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition-colors',
          locale === 'fr'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        FR
      </button>

      <button
        type="button"
        onClick={() => handleLanguageChange('ar')}
        aria-pressed={locale === 'ar'}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition-colors',
          locale === 'ar'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        AR
      </button>
    </div>
  )
}