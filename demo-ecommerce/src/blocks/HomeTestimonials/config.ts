// blocks/HomeTestimonials/config.ts
import { colorSelect } from '@/fields/colorSelect'
import { iconsSelect } from '@/fields/iconsSelect'
import type { Block } from 'payload'

export const HomeTestimonials: Block = {
  slug: 'homeTestimonials',
  interfaceName: 'HomeTestimonialsType',
  imageURL: '/blocks/hometestimonials.png',
  labels: {
    singular: 'Home Testimonials',
    plural: 'Home Testimonials',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Badge',
      fields: [
        iconsSelect({
          name: 'icon',
          required: true,
        }),
        {
          name: 'badge',
          type: 'text',
          label: 'Badge Text',
          localized: true,
          defaultValue: 'Reviews',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Content',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section Title',
          required: true,
          localized: true,
          defaultValue: 'What Our Customers Say',
        },
        {
          name: 'subtitle',
          type: 'textarea',
          label: 'Section Subtitle',
          localized: true,
          defaultValue: 'Thousands of customers trust us for their everyday shopping',
        },
        {
          name: 'verifiedLabel',
          type: 'text',
          label: 'Verified Purchase Label',
          localized: true,
          defaultValue: 'Verified Purchase',
          admin: {
            description: 'This label is used for all reviews',
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Featured Review',
      fields: [
        {
          name: 'featuredImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Featured Image',
          required: true,
        },
        {
          name: 'featuredText',
          type: 'textarea',
          label: 'Featured Review Text',
          required: true,
          localized: true,
        },
        {
          name: 'featuredName',
          type: 'text',
          label: 'Featured Reviewer Name',
          required: true,
          localized: true,
        },
        {
          name: 'featuredLocation',
          type: 'text',
          label: 'Featured Reviewer Location',
          localized: true,
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Reviews',
      fields: [
        {
          name: 'reviews',
          type: 'array',
          label: 'Reviews',
          required: true,
          minRows: 2,
          maxRows: 8,
          fields: [
            {
              name: 'avatar',
              type: 'upload',
              relationTo: 'media',
              label: 'Avatar',
              required: true,
            },
            {
              name: 'name',
              type: 'text',
              label: 'Reviewer Name',
              required: true,
              localized: true,
            },
            {
              name: 'location',
              type: 'text',
              label: 'Location',
              localized: true,
            },
            {
              name: 'reviewText',
              type: 'textarea',
              label: 'Review Text',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Statistics',
      fields: [
        {
          name: 'stats',
          type: 'array',
          label: 'Statistics',
          required: true,
          minRows: 2,
          maxRows: 6,
          fields: [
            iconsSelect({
              name: 'icon',
              required: true,
              label: 'Stat Icon',
            }),
            colorSelect({
              name: 'iconColor',
              required: false,
              label: 'Icon Color',
            }),
            {
              name: 'value',
              type: 'text',
              label: 'Value',
              required: true,
              localized: true,
            },
            {
              name: 'label',
              type: 'text',
              label: 'Label',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
  ],
}