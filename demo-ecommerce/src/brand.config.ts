/**
 * Identité de la boutique — le seul fichier à modifier pour une nouvelle démo.
 *
 * Le logo, les contacts et les réseaux sociaux affichés sur le site se règlent
 * dans l'admin (Header / Footer). Les couleurs sont dans
 * `src/app/(frontend)/globals.css` (variables `--brand-*`).
 */
export const brand = {
  /** Nom complet (titres, SEO, emails, flux produits). */
  name: 'Sable',
  /** Nom court affiché dans le logo texte quand aucun logo n'est chargé. */
  shortName: 'sable',
  /** Titre de l'administration. */
  adminTitle: 'Sable Admin',
  /** URL publique utilisée quand NEXT_PUBLIC_SERVER_URL n'est pas défini. */
  siteUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'https://demo.sable-store.tn',
  /** Logos statiques (public/brand). */
  logo: '/brand/logo.svg',
  icon: '/brand/icon.svg',
} as const
