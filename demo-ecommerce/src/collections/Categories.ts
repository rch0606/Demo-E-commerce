import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { slugField } from 'payload'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Catégorie',
    plural: 'Catégories',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title', 
    group: 'Gestion de stock',
  },
  fields: [
    slugField({
      useAsSlug: 'title',
      position: 'sidebar',
    }),
    {
      // Range la catégorie dans le menu du header : colonne « Rayons » ou
      // cartes « Collections » (saisons, événements).
      name: 'kind',
      label: 'Type',
      type: 'select',
      // Vide = automatique : Été et Hiver en collections, le reste en rayons.
      options: [
        { label: 'Rayon (femme, homme…)', value: 'age' },
        { label: 'Collection (saison, événement)', value: 'collection' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Les collections s’affichent en cartes avec photo dans le menu Catégories.',
      },
    },
    {
      name: 'order',
      label: 'Ordre dans le menu',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Plus petit = plus haut. Vide = après les catégories numérotées.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              localized: true,
              admin: {
                description: 'Category title',
              },
            },
            {
              name: 'description',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'Category description for display',
                rows: 3,
              },
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description: 'Category featured image',
              },
            },

          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'meta',
              label: 'SEO Settings',
              type: 'group',
              fields: [
                OverviewField({
                  titlePath: 'meta.title',
                  descriptionPath: 'meta.description',
                  imagePath: 'meta.image',
                }),
                MetaTitleField({
                  hasGenerateFn: true,
                }),
                MetaImageField({
                  relationTo: 'media',
                }),
                MetaDescriptionField({}),
                PreviewField({
                  hasGenerateFn: true,
                  titlePath: 'meta.title',
                  descriptionPath: 'meta.description',
                }),
              ],
            },
          ],
        },
        
      ],
      
    },
  ],
}