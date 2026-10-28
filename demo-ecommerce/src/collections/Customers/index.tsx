import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
  slug: 'customers',

  labels: {
    singular: 'Client',
    plural: 'Clients',
  },

  admin: {
    useAsTitle: 'name',
    group: 'Utilisateurs',
    hidden: ({ user }) => user?.role === 'seo',
    defaultColumns: [
      'name',
      'phone',
      'email',
      'governorate',
      'totalOrders',
      'totalSpent',
      'lastOrderDate',
    ],
  },

  access: {
    create: () => false,
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },

  fields: [
    {
      name: 'name',
      label: 'Nom',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'phone',
      label: 'Téléphone',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'email',
      label: 'Email',
      type: 'email',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'address',
      label: 'Adresse',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'governorate',
      label: 'Gouvernorat',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'childrenBirthDates',
      label: "Dates d'anniversaire des enfants",
      type: 'array',
      fields: [
        {
          name: 'date',
          label: 'Date',
          type: 'date',
        },
      ],
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'totalOrders',
      label: 'Nombre de commandes',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'totalSpent',
      label: 'Total dépensé',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'lastOrderDate',
      label: 'Dernière date de commande',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'lastOrderNumber',
      label: 'Dernière commande',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },

    {
      name: 'lastBirthdayPromoSent',
      label: 'Dernier email anniversaire envoyé',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Date du dernier code promo anniversaire envoyé',
      },
    },
  ],
}
