import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: {
    singular: 'Notification',
    plural: 'Notifications',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'user', 'read', 'createdAt'],
    group: 'Gestion de ventes',
    hidden: true,
  },
  access: {
    create: authenticated,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner' || user.role === 'admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'owner' || user.role === 'admin') return true
      return {
        user: {
          equals: user.id,
        },
      }
    },
    delete: ({ req: { user } }) =>
      user?.role === 'owner' || user?.role === 'admin',
  },
  fields: [
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Nouvelle commande', value: 'new_order' },
        { label: 'Rappel commande', value: 'order_reminder' },
        { label: 'Commande importante', value: 'high_value_order' },
        { label: 'Changement de statut', value: 'status_change' },
        { label: 'Nouvel avis', value: 'new_review' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'title',
      label: 'Titre',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
    },
    {
      name: 'order',
      label: 'Commande',
      type: 'relationship',
      relationTo: 'orders',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'review',
      label: 'Avis',
      type: 'relationship',
      relationTo: 'reviews',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'user',
      label: 'Destinataire',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'read',
      label: 'Lu',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
