import type { Block } from 'payload'

export const HomeCategories: Block = {
  slug: 'homeCategories',
  interfaceName: 'HomeCategoriesType',
  imageURL : '/blocks/categories.png',
  labels: {
    singular: 'Home Categories',
    plural: 'Home Categories',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true,
      localized: true,
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Subtitle',
      localized: true,
    },
    {
      name: 'categories',
      type: 'relationship',
      label: 'Categories',
      relationTo: 'categories',
      hasMany: true,
      required: true,
      maxDepth: 2,
      admin: {
        isSortable: true,
      },
    },
  ],
}