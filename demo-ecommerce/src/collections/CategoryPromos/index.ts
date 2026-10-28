import type { CollectionConfig } from 'payload'
import { anyone } from '../../access/anyone'
import { revalidateTag } from 'next/cache'

// Une promo modifie les prix affichés : le <lastmod> du sitemap produits doit suivre.
const revalidateProductsSitemap = () => {
  try {
    revalidateTag('products-sitemap', 'max')
  } catch {
    // Hors requête Next : le cache horaire du sitemap prendra le relais.
  }
}

export const CategoryPromos: CollectionConfig = {
  slug: 'category-promos',

  labels: {
    singular: 'Promotion de catégorie',
    plural: 'Promotions de catégories',
  },

  admin: {
    useAsTitle: 'name',
    group: 'Gestion de ventes',
    defaultColumns: ['name', 'categories', 'percentage', 'active', 'startsAt', 'endsAt'],
    description:
      'Applique une réduction automatique à tous les produits des catégories sélectionnées.',
  },

  access: {
    // Les prix affichés sont publics : la promotion doit être lisible par les visiteurs.
    read: anyone,
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'owner' || req.user?.role === 'seo',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'owner' || req.user?.role === 'seo',
    delete: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'owner' || req.user?.role === 'seo',
  },

  hooks: {
    afterChange: [({ doc }) => { revalidateProductsSitemap(); return doc }],
    afterDelete: [({ doc }) => { revalidateProductsSitemap(); return doc }],
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom de la promotion',
      admin: {
        description: 'Usage interne, par exemple « Soldes d’été » ou « Rentrée -30% ».',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
      label: 'Catégories concernées',
      admin: {
        description: 'Tous les produits rattachés à ces catégories sont remisés.',
      },
    },
    {
      name: 'excludedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Produits exclus',
      admin: {
        description:
          'Ces produits gardent leur prix habituel — et leur éventuelle promo propre — même s’ils appartiennent aux catégories ci-dessus.',
      },
      // Ne proposer que les produits réellement visés par la promotion.
      filterOptions: ({ data }: any) => {
        const categories = Array.isArray(data?.categories) ? data.categories : []
        if (!categories.length) return true

        return {
          categories: {
            in: categories.map((category: any) =>
              category && typeof category === 'object' ? category.id : category,
            ),
          },
        }
      },
    },
    {
      name: 'productsCreatedBefore',
      type: 'date',
      label: 'Seulement les produits créés avant le',
      admin: {
        description:
          'Les produits créés après cette date ne reçoivent pas cette promotion, même dans les catégories ci-dessus. Laisser vide pour l’appliquer à tous les produits.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'percentage',
      type: 'number',
      required: true,
      min: 1,
      max: 99,
      label: 'Réduction (%)',
      admin: {
        description: 'Pourcentage retiré du prix de base de chaque produit.',
        step: 1,
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Promotion active',
      admin: {
        position: 'sidebar',
        description: 'Décocher suspend la promotion sans la supprimer.',
      },
    },
    {
      name: 'startsAt',
      type: 'date',
      label: 'Début (optionnel)',
      admin: {
        position: 'sidebar',
        description: 'Laisser vide pour démarrer immédiatement.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      label: 'Fin (optionnel)',
      admin: {
        position: 'sidebar',
        description: 'Laisser vide pour une promotion sans date de fin.',
        date: { pickerAppearance: 'dayAndTime' },
      },
      validate: (value: unknown, { siblingData }: any) => {
        const startsAt = siblingData?.startsAt
        if (!value || !startsAt) return true

        if (new Date(value as string) <= new Date(startsAt)) {
          return 'La date de fin doit être postérieure à la date de début.'
        }

        return true
      },
    },
  ],
}
