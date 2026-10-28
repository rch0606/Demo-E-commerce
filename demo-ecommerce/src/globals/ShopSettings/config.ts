import type { GlobalConfig } from 'payload'

/**
 * Réglages commerciaux de la boutique.
 *
 * Les frais de livraison vivent ici plutôt qu'en dur dans le code : ils
 * changent au rythme du transporteur, pas à celui des déploiements. Le montant
 * est figé sur chaque commande au moment de sa création, pour qu'une
 * modification ultérieure ne réécrive pas l'historique.
 */
export const ShopSettings: GlobalConfig = {
  slug: 'shop-settings',
  label: 'Paramètres boutique',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Gestion de ventes',
    hidden: ({ user }) => user?.role !== 'admin' && user?.role !== 'owner',
  },
  fields: [
    {
      name: 'deliveryFee',
      label: 'Frais de livraison (DT)',
      type: 'number',
      required: true,
      defaultValue: 8,
      min: 0,
      admin: {
        description: 'Montant ajouté au total de chaque commande.',
      },
    },
  ],
}
