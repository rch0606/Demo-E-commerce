import { CollectionConfig } from 'payload'
import {
  restoreInventoryOnOrderDelete,
  syncInventoryOnOrderChange,
  validateStockBeforeOrderChange,
} from './hooks/syncInventory'
import { syncCustomerOnOrderChange, syncCustomerOnOrderDelete } from './hooks/syncCustomer'
import { incrementPromoUsageOnOrderCreate } from './hooks/incrementPromoUsage'
import { notifyOnNewOrder } from './hooks/notifyOnNewOrder'

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: 'Commande',
    plural: 'Commandes',
  },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber' ,'customerName', 'customerPhone', 'customerGouvernorat', 'author', 'source', 'status', 'totalAmount',  'createdAt'],
    group: 'Gestion de ventes',
    hidden: ({ user }) => {
    return user?.role == 'seo'
    },
    components: {
      beforeList: [
        {
          path: '@/components/AdminManagement/orderManagement/OrdersList',
        },
      ],
      views: {
        edit: {
          default: {
            Component: '@/components/AdminManagement/orderManagement/OrderEdit',
          },
        },
      },

    },
  },

  access: {
    create: () => true,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    // Only admin / owner can delete orders (sales cannot)
    delete: ({ req: { user } }) =>
      user?.role === 'admin' || user?.role === 'owner',
  },
  
  fields: [
    {
        name: 'orderNumber',
        label: 'Référence',
        type: 'text',
        unique: true,
        admin: {
          readOnly: true,
          position: 'sidebar',
        },
        hooks: {
          beforeChange: [
            async ({ req, data, originalDoc, operation }) => {
              if (operation !== 'create') {
                return data?.orderNumber || originalDoc?.orderNumber
              }

              const payload = req.payload

              const lastOrder = await payload.find({
                collection: 'orders',
                limit: 1,
                sort: '-createdAt',
                depth: 0,
              })

              let nextNumber = 1

              if (lastOrder.docs.length) {
                const lastRef = lastOrder.docs[0].orderNumber

                const match = lastRef?.match(/^CMD-(\d+)$/)

                if (match) {
                  nextNumber = Number(match[1]) + 1
                }
              }

              return `CMD-${String(nextNumber).padStart(6, '0')}`
            },
          ],
        },
      },
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        hasMany: true,
        required: true,
        admin: {
          position: 'sidebar',
        },
      },
      {
        name: 'items',
        label: 'Articles commandés',
        type: 'array',
        admin: {
          readOnly: true,
          description: 'Détail des articles commandés (rempli automatiquement)',
        },
        fields: [
          {
            name: 'productId',
            label: 'Produit',
            type: 'text',
          },
          {
            name: 'variantId',
            label: 'Variant',
            type: 'text',
          },
          {
            name: 'title',
            label: 'Nom du produit',
            type: 'text',
          },
          {
            name: 'attributes',
            label: 'Options choisies',
            type: 'text',
          },
          {
            name: 'quantity',
            label: 'Quantité',
            type: 'number',
            min: 1,
          },
          {
            name: 'price',
            label: 'Prix unitaire',
            type: 'number',
          },
          {
            // Figé à la commande : le prix de référence du produit peut changer
            // ensuite, la remise consentie ce jour-là doit rester lisible.
            name: 'oldPrice',
            label: 'Prix initial',
            type: 'number',
            admin: {
              description: 'Prix avant remise au moment de la commande (vide si aucune promotion)',
            },
          },
          {
            name: 'subtotal',
            label: 'Sous-total',
            type: 'number',
          },
        ],
      },
      {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { label: 'Nouvelle', value: 'new' },
        { label: 'Validée', value: 'validated' },
        { label: 'Annulée', value: 'cancelled' },
        { label: 'Retournée', value: 'returned' },
      ],
        defaultValue: 'new',
        required: true,
        admin: {
          position: 'sidebar',
        },
      },
      {
        name: 'reminderSentAt',
        label: 'Rappel envoyé le',
        type: 'date',
        admin: {
          position: 'sidebar',
          readOnly: true,
          description:
            'Date du rappel automatique (une seule fois). Rempli par le job cron.',
          date: {
            pickerAppearance: 'dayAndTime',
          },
          condition: (_data, _sibling, { user }) => {
            const role = (user as { role?: string } | null)?.role
            return role === 'owner' || role === 'admin'
          },
        },
      },
      {
        name: 'quantity',
        type: 'number',
        required: true,
        min: 1,
        defaultValue: 1,
        admin: {
          readOnly: true,
        },
      },
      {
        // Figés à la commande : changer le réglage boutique ne doit pas
        // réécrire le montant facturé aux commandes déjà passées.
        name: 'deliveryFee',
        label: 'Frais de livraison',
        type: 'number',
        defaultValue: 0,
        admin: {
          position: 'sidebar',
          readOnly: true,
          description: 'Inclus dans le total',
        },
      },
      {
        name: 'totalAmount',
        label: 'Total',
        type: 'number',
        required: true,
        admin: {
          position: 'sidebar',
          readOnly: true,
          description: 'Articles − remise + livraison',
        },
      },
      {
    name: 'customer',
    type: 'relationship',
    relationTo: 'customers',
    admin: {
        readOnly: true,
    },
},
      {
        name: 'customerName',
        label : 'Nom du client',
        type: 'text',
        required: true,
      },
      {
        name: 'customerPhone',
        label : 'Téléphone',
        type: 'text',
        required: true,
      },
      {
        name: 'customerEmail',
        label: 'Email',
        type: 'email',
      },
      {
        name: 'customerAddress',
        label : 'Adresse',
        type: 'text',
      },
      {
        name: 'customerGouvernorat',
        label : 'Gouvernorat',
        type: 'text',
      },
      // ✅ ADD THIS FIELD - Customer Birth Date
      // Add this field after customerBirthDate in your Orders collection
      {
        name: 'customerChildrenBirthDates',
        label: "Dates d'anniversaire des enfants",
        type: 'array',
        admin: {
          position: 'sidebar',
          readOnly: true,
          description: 'Toutes les dates d\'anniversaire des enfants',
        },
        fields: [
          {
            name: 'date',
            label: 'Date',
            type: 'date',
          },
        ],
      },
      {
        name: 'promoCode',
        label: 'Code promo utilisé',
        type: 'text',
      },
      {
        name: 'author',
        label : 'Responsable',
        type: 'relationship',
        relationTo: 'users',
        hasMany: false,
        defaultValue: ({ user }) => user?.id ?? null,
        admin: { position: 'sidebar' },
      },
      {
        name : 'source',
        label : 'Source',
        type : 'select',
        required : true,
        defaultValue : 'website',
        options : [
          {
            label : 'Site Web',
            value : 'website'
          },
          {
            label : 'Instagram',
            value : 'instagram'
          },
          {
            label : 'Facebook',
            value : 'facebook'
          },
          {
            label : 'WhatsApp',
            value : 'whatsapp'
          },
          {
            label : 'Boutique',
            value : 'boutique'
          },
        ],
        admin: { position: 'sidebar' }
        
      },
      {
        name: 'visitId',
        label: 'Visite (session)',
        type: 'text',
        index: true,
        admin: {
          position: 'sidebar',
          readOnly: true,
          description:
            'ID de session analytics (_tid). Relie cette commande à la visite storefront.',
          condition: (_data, _sibling, { user }) => {
            const role = (user as { role?: string } | null)?.role
            return role === 'owner' || role === 'admin'
          },
        },
      },
      {
        name: 'visitorId',
        label: 'Visiteur',
        type: 'text',
        index: true,
        admin: {
          position: 'sidebar',
          readOnly: true,
          description: 'ID visiteur long terme (_vid).',
          condition: (_data, _sibling, { user }) => {
            const role = (user as { role?: string } | null)?.role
            return role === 'owner' || role === 'admin'
          },
        },
      },
      {
        name : 'note',
        label : 'Note',
        type : 'textarea',
        
      },

     
  ],
  hooks: {
    beforeChange: [validateStockBeforeOrderChange],
    afterChange: [
      syncInventoryOnOrderChange,
      syncCustomerOnOrderChange,
      incrementPromoUsageOnOrderCreate,
      notifyOnNewOrder,
    ],
    afterDelete: [restoreInventoryOnOrderDelete, syncCustomerOnOrderDelete],
  },
}