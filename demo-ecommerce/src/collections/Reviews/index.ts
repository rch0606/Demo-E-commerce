import type { Access, CollectionConfig, FieldAccess } from 'payload'

import { notifyNewReview } from './hooks/notifyNewReview'
import { refreshProductReviewStats, refreshProductReviewStatsAfterDelete } from './hooks/refreshProductReviewStats'
import { deleteReviewFromMerchant, syncReviewToMerchant } from './hooks/syncReviewToMerchant'

const canModerate = (role?: string | null) => role === 'owner' || role === 'admin' || role === 'seo'

const moderators: Access = ({ req }) => canModerate(req.user?.role)

// Le nom, la note et le commentaire sont publics ; l'email et l'empreinte IP
// ne sortent jamais de l'admin.
const moderatorsOnlyField: FieldAccess = ({ req }) => Boolean(req.user)

export const Reviews: CollectionConfig = {
  slug: 'reviews',

  labels: {
    singular: 'Avis',
    plural: 'Avis',
  },

  admin: {
    useAsTitle: 'authorName',
    group: 'Gestion de ventes',
    defaultColumns: ['authorName', 'product', 'rating', 'status', 'createdAt'],
    listSearchableFields: ['authorName', 'comment'],
    description:
      'Avis laissés par les visiteurs sur les fiches produits. Un avis n’est affiché sur le site qu’une fois « Approuvé ».',
  },

  access: {
    // Le site n'affiche que les avis approuvés ; l'admin voit tout.
    read: ({ req }) => (req.user ? true : { status: { equals: 'approved' } }),
    // Les visiteurs passent par /api/reviews/submit (anti-spam) : l'API REST
    // de création reste fermée.
    create: moderators,
    update: moderators,
    delete: moderators,
  },

  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      label: 'Produit',
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      label: 'Note (1 à 5)',
      admin: { step: 1 },
    },
    {
      name: 'title',
      type: 'text',
      maxLength: 120,
      label: 'Titre',
    },
    {
      name: 'comment',
      type: 'textarea',
      required: true,
      maxLength: 2000,
      label: 'Commentaire',
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
      maxLength: 60,
      label: 'Nom affiché',
    },
    {
      name: 'authorEmail',
      type: 'email',
      label: 'Email (privé)',
      access: { read: moderatorsOnlyField },
      admin: { description: 'Jamais affiché sur le site.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      label: 'Statut',
      options: [
        { label: 'En attente', value: 'pending' },
        { label: 'Approuvé', value: 'approved' },
        { label: 'Refusé', value: 'rejected' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'locale',
      type: 'select',
      defaultValue: 'fr',
      label: 'Langue',
      options: [
        { label: 'Français', value: 'fr' },
        { label: 'Arabe', value: 'ar' },
        { label: 'Anglais', value: 'en' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      // Empreinte (hash) de l'IP, pour limiter le nombre d'avis par visiteur.
      name: 'ipHash',
      type: 'text',
      index: true,
      access: { read: moderatorsOnlyField },
      admin: { hidden: true },
    },
  ],

  hooks: {
    afterChange: [refreshProductReviewStats, notifyNewReview, syncReviewToMerchant],
    afterDelete: [refreshProductReviewStatsAfterDelete, deleteReviewFromMerchant],
  },

  timestamps: true,
}

export default Reviews
