import type { CollectionConfig } from 'payload'

export const ChiffreAffaire: CollectionConfig = {
  slug: 'chiffre-affaire',

  admin: {
    group: false,
    hidden: ({ user }) => user?.role !== 'owner' && user?.role !== 'admin',
    components: {
      views: {
        list: {
          Component: '@/components/ChiffreAffaire',
        },
      },
    },
  },

  access: {
    read: ({ req }) => req.user?.role === 'owner' || req.user?.role === 'admin',
  },

  fields: [],
}
