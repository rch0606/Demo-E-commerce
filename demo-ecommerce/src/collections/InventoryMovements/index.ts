import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

export const InventoryMovements: CollectionConfig = {
  slug: 'inventory-movements',
  labels: {
    singular: 'Mouvement de stock',
    plural: 'Mouvements de stock',
  },
  admin: {
    useAsTitle: 'movementType',
    group: 'Gestion de stock',
     hidden: ({ user }) => {
    return user?.role == 'seo'
  },
    components: {
      afterList: [
        {
          path: '@/components/AdminManagement/stockMouvement',
        },
        {
          path: '@/components/AdminManagement/stockMovementHistory',
        },
      ],
    },
    defaultColumns: [
      'movementType',
      'product',
      'variant',
      'productAttributes',
      'quantity',
      'beforeStock',
      'afterStock',
      'createdAt',
    ],
  },
  access: {
    read: authenticated,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'movementType',
      label: 'Type de mouvement',
      type: 'select',
      required: true,
      options: [
        { label: 'Entrée de stock', value: 'stock_entry' },
        { label: 'Sortie de stock', value: 'stock_exit' },
        { label: 'Sortie commande', value: 'order_deduct' },
        { label: 'Retour commande', value: 'order_restore' },
        { label: 'Ajustement manuel', value: 'manual_adjustment' },
        { label: 'Retour client', value: 'customer_return' },
      ],
      admin: { position: 'sidebar' }
    },
    {
      name: 'product',
      label: 'Produit',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      admin: { position: 'sidebar' }
    },
    {
      name: 'variant',
      label: 'Variante',
      type: 'relationship',
      relationTo: 'variants',
      admin: {
        position: 'sidebar',
        description: 'Utilisé uniquement pour les produits variables',
      }
    },
    {
      name: 'productAttributes',
      label: 'Attributs produit',
      type: 'relationship',
      relationTo: 'attributeValues',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description: 'Utilisé pour les produits simples sans variantes',
      }
    },
    {
      name: 'order',
      label: 'Commande',
      type: 'relationship',
      relationTo: 'orders',
      admin: { position: 'sidebar' }
    },
    {
      name: 'quantity',
      label: 'Quantité',
      type: 'number',
      required: true,
      min: 0,
      admin: { position: 'sidebar' }
    },
    {
      name: 'beforeStock',
      label: 'Stock avant',
      type: 'number',
      required: true,
      min: 0,
      admin: { position: 'sidebar' }
    },
    {
      name: 'afterStock',
      label: 'Stock après',
      type: 'number',
      required: true,
      min: 0,
      admin: { position: 'sidebar' }
    },
    {
      name: 'reason',
      label: 'Raison',
      type: 'text',
    },
    {
      name: 'performedBy',
      label: 'Effectué par',
      type: 'relationship',
      relationTo: 'users',
      defaultValue: ({ user }) => user?.id ?? null,
      admin: { position: 'sidebar' }
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
    }
  ],
  timestamps: true,
}

export default InventoryMovements