import type { Where } from 'payload'

/**
 * Condition des listes de la boutique (boutique, catégories, accueil,
 * recherche, produits similaires) : un produit épuisé n'y apparaît plus.
 *
 * Il n'est jamais supprimé : il reste dans l'admin, le chiffre d'affaires et
 * les statistiques, sa page produit reste accessible (affichée « Épuisé ») et
 * il revient de lui-même dans les listes dès que du stock est ajouté.
 */
export const IN_STOCK_WHERE: Where = { totalStock: { greater_than: 0 } }
