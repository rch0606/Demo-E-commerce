import { brand } from '@/brand.config'
import { cn } from '@/lib/utils'

/** Logo texte utilisé tant qu'aucun logo n'est chargé dans Header / Footer. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-heading font-medium lowercase tracking-wide text-foreground select-none',
        className,
      )}
    >
      {brand.shortName}
    </span>
  )
}
