import { iconsSelect } from '@/fields/iconsSelect'
import type { Block } from 'payload'

export const HomePromo: Block = {
  slug: 'homePromo',
  interfaceName: 'HomePromoType',
  imageURL: '/blocks/homepromo.png',
  labels: {
    singular: 'Home Promo',
    plural: 'Home Promo',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Promotion',
      fields: [
        {
          name: 'categoryPromo',
          type: 'relationship',
          relationTo: 'category-promos',
          label: 'Promotion de catégorie',
          admin: {
            description:
              "Rattache la bannière à une promotion existante. Le compte à rebours suit alors sa date de fin, le bouton pointe vers la catégorie remisée, et le jeton {promo} inséré dans les textes est remplacé par le pourcentage réel. La bannière disparaît quand la promotion n'est plus active.",
          },
        },
      ],
    },
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
          defaultValue: 'Limited Time Offer',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Content',
      fields: [
        {
          name: 'headlinePre',
          type: 'text',
          label: 'Headline (Before Highlight)',
          required: true,
          localized: true,
          defaultValue: 'Up to 40% off our',
        },
        {
          name: 'headlineHighlight',
          type: 'text',
          label: 'Headline Highlight',
          required: true,
          localized: true,
          defaultValue: 'Home & Decor',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          localized: true,
          defaultValue: 'Cosy decor, lighting and soft textiles for a home that feels like you. Limited stock available!',
        },
        {
          name: 'ctaText',
          type: 'text',
          label: 'CTA Button Text',
          localized: true,
          defaultValue: 'Shop the Collection',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'CTA Link',
      fields: [
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
          label: 'Catégorie',
          admin: {
            description:
              "Destination du bouton. Laisser vide pour pointer vers la catégorie de la promotion rattachée.",
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Promo Image',
      fields: [
        {
          name: 'promoImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Promo Image',
          required: true,
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Countdown',
      fields: [
        {
          name: 'endDate',
          type: 'date',
          label: 'End Date',
          admin: {
            description:
              'Fin du compte à rebours. Laisser vide pour suivre la date de fin de la promotion rattachée.',
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Trust Badges',
      fields: [
        {
          name: 'trustBadges',
          type: 'array',
          label: 'Trust Badges',
          minRows: 2,
          maxRows: 4,
          fields: [
            iconsSelect({
              name: 'icon',
              required: true,
              label: 'Badge Icon',
            }),
            {
              name: 'label',
              type: 'text',
              label: 'Badge Label',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
  ],
}