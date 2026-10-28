import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',

  access: {
    admin: authenticated,
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },

  admin: {
    defaultColumns: ['name', 'email', 'role'],
    useAsTitle: 'name',
     hidden: ({ user }) => {
    return user?.role !== 'admin' 
  },
  },

  auth: true,

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
        name: 'role',
        type: 'select',
        defaultValue: 'admin',
        options: [
          { label: 'Owner', value: 'owner' },
          { label: 'Admin', value: 'admin' },
          { label: 'Sales', value: 'sales' },
          { label: 'SEO', value: 'seo' },
        ],
        access: {
          update: ({ req }) => {
            const user = req.user

            return user?.role === 'owner' || user?.role === 'admin'
          },
        },
      },
  ],

  timestamps: true,
}