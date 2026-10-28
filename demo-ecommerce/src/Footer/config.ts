import type { GlobalConfig } from 'payload'
import { iconsSelect } from '@/fields/iconsSelect'
import { link } from '@/fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  admin: {
    group: 'SEO',
      hidden: ({ user }) => {
    return user?.role !== 'admin'  && user?.role !== 'seo'
  },
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Logo & Description',
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Categories Section',
      fields: [
        {
          name: 'categoriesTitle',
          type: 'text',
          localized: true,
          required: true,
          defaultValue: 'Categories',
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Contact Information',
      fields: [
        {
          name: 'contactsTitle',
          type: 'text',
          localized: true,
          required: true,
          defaultValue: 'Contact',
        },
        {
          name: 'contacts',
          type: 'array',
          admin: {
            initCollapsed: true,
          },
          fields: [
            iconsSelect({
              name: 'icon',
              required: true,
            }),
            link({
              appearances: false,
            }),
          ],
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Social Media',
      fields: [
        {
          name: 'socialTitle',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'whatsappnumber',
          label: 'WhatsApp Number',
          type: 'text',
          required: true,
          defaultValue: false,
          
        },

        {
          name: 'socialLinks',
          type: 'array',
          minRows: 1,
          maxRows: 8,
          admin: {
            initCollapsed: true,
          },
          fields: [
            iconsSelect({
              name: 'icon',
              required: true,
            }),
            {
              name: 'url',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },

    {
      type: 'collapsible',
      label: 'Copyright',
      fields: [
        {
          name: 'developerName',
          label: 'Company name',
          type: 'text',
          required: true,
          defaultValue: 'Rktec Solution',
          admin: {
            description: '©️ 2026 [Company name]',
            placeholder: 'Rktec Solution',
          },
        },
        {
          name: 'developerUrl',
          label: 'Company website URL',
          type: 'text',
          admin: {
            description: 'Optional. Makes the company name clickable. e.g. https://rktec.com',
            placeholder: 'https://',
          },
        },
      ],
    },
  ],
}