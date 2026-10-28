import type { CollectionConfig } from 'payload'
import { generateUniquePromoCode } from '../CodePromo/hooks/generatePromoCode'


export const PromoCodes: CollectionConfig = {
  slug: 'promo-codes',

  labels: {
    singular: 'Code promo',
    plural: 'Codes promo',
  },

  admin: {
    useAsTitle: 'promoCode',
    group: 'Gestion de ventes',
    hidden: ({ user }) => user?.role !== 'owner' && user?.role !== 'admin',
    defaultColumns: [
      'promoCode',
      'description',
      'discountType',
      'discountValue',
      'active',
      'valid',
      'startDate',
      'endDate',
      'usageCount',
    ],
  },

  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'owner',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'owner',
    delete: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'owner',
  },

  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        if (!data) return data

        // Generate promo code automatically only on creation
        if (operation === 'create' && !data.promoCode) {
          data.promoCode = await generateUniquePromoCode()
        }

        // Normalize code to uppercase
        if (data.promoCode && typeof data.promoCode === 'string') {
          data.promoCode = data.promoCode.trim().toUpperCase()
        }

        // On update, Payload may only send changed fields.
        // Merge with originalDoc so validity is calculated from the full document.
        const source =
          operation === 'update' && originalDoc
            ? { ...originalDoc, ...data }
            : data

        const now = new Date()

        const startDate = source.startDate ? new Date(source.startDate) : null
        const endDate = source.endDate ? new Date(source.endDate) : null

        const dateValid =
          (!startDate || now >= startDate) &&
          (!endDate || now <= endDate)

        const usageCount = source.usageCount ?? 0
        const usageValid =
          !source.usageCodeLimit || usageCount < source.usageCodeLimit

        // Manual pause switch (default true). Dates still expire the code automatically.
        const isActive = source.active !== false

        data.valid = isActive && dateValid && usageValid

        return data
      },
    ],
  },

  timestamps: true,

  fields: [
    {
      name: 'promoCode',
      label: 'Code promo',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        readOnly: true,
        description: 'Ce code sera généré automatiquement après la création.',
      },
    },

    {
      name: 'description',
      label: 'Description',
      type: 'text',
      admin: {
        placeholder:
          'Ex: Anniversaire, Promotion rentrée scolaire, offre spéciale...',
      },
    },

    {
      name: 'active',
      label: 'Actif',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Décochez pour suspendre manuellement ce code. L’expiration par date reste automatique.',
      },
    },

    {
      name: 'valid',
      label: 'Valide',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Calculé automatiquement : actif + dates + limite d’utilisation.',
      },
    },

    {
      name: 'startDate',
      label: 'Date de début',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    {
      name: 'endDate',
      label: 'Date de fin',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },

    {
      name: 'products',
      label: 'Produits concernés',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description:
          'Laissez vide pour appliquer à tous les produits. Sinon, le code ne fonctionne que sur les produits sélectionnés.',
      },
    },

    {
      name: 'discountType',
      label: 'Type de réduction',
      type: 'select',
      required: true,
      options: [
        { label: 'Pourcentage', value: 'percentage' },
        { label: 'Montant fixe', value: 'amount' },
      ],
    },

    {
      name: 'discountValue',
      label: 'Valeur de la réduction',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Pourcentage (ex: 20) ou montant fixe en TND (ex: 15).',
      },
    },

    {
      name: 'minOrderValue',
      label: 'Montant minimum de commande',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Le panier doit atteindre ce montant pour utiliser le code.',
      },
    },

    {
      name: 'maxDiscount',
      label: 'Réduction maximum (TND)',
      type: 'number',
      min: 0,
      admin: {
        description:
          'Plafond pour les pourcentages (ex: 20% plafonné à 50 TND). Laissez vide = pas de plafond.',
        condition: (_, siblingData) => siblingData?.discountType === 'percentage',
      },
    },

    {
      name: 'usageCount',
      label: "Nombre d'utilisations",
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },

    {
      name: 'usageCodeLimit',
      label: "Limite d'utilisations",
      type: 'number',
      min: 1,
      admin: {
        description: 'Laissez vide = utilisations illimitées.',
      },
    },
  ],
}
