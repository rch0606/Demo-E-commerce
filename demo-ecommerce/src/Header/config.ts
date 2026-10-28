import type { GlobalConfig } from 'payload'
import { link } from '@/fields/link'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  admin: {
    group: 'SEO',
      hidden: ({ user }) => {
    return user?.role !== 'admin' && user?.role !== 'seo'
  },
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo',
      required: false,
    },
    {
      name: 'navItems',
      type: 'array',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'link',
          options: [
            {
              label: 'Link',
              value: 'link',
            },
            {
              label: 'Categories Dropdown',
              value: 'categories',
            },
          ],
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
          admin: {
            condition: (_, siblingData) =>
              siblingData?.type === 'categories',
          },
        },
        link({
          appearances: false,
          overrides: {
            admin: {
              condition: (_, siblingData) =>
                siblingData?.type === 'link',
            },
          },
        }),
      ],
    },
  ],
}