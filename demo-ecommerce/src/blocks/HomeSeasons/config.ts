import type { Block } from 'payload'

type Copy = Record<'fr' | 'ar' | 'en', string>

/** Valeur par défaut dans la langue en cours d'édition (français sinon). */
const byLocale = (copy: Copy) => ({ locale }: { locale?: string }) =>
  copy[(locale as keyof Copy) ?? 'fr'] ?? copy.fr

const SEASONS = [
  {
    slug: 'ete',
    label: { fr: 'Été', ar: 'الصيف', en: 'Summer' },
    description: {
      fr: 'Des tenues légères et colorées pour profiter du soleil.',
      ar: 'ملابس خفيفة وملونة للاستمتاع بالشمس.',
      en: 'Light, colourful outfits to enjoy the sunshine.',
    },
  },
  {
    slug: 'hiver',
    label: { fr: 'Hiver', ar: 'الشتاء', en: 'Winter' },
    description: {
      fr: 'Des pièces douces et chaudes pour les journées fraîches.',
      ar: 'قطع ناعمة ودافئة للأيام الباردة.',
      en: 'Soft, warm pieces for chilly days.',
    },
  },
]

const SEE_ALL: Copy = { fr: 'Voir toute la collection', ar: 'شاهد المجموعة كاملة', en: 'See the whole collection' }

/**
 * Collections saisonnières (Été, Hiver…) : un onglet par saison, chacun
 * adossé à une catégorie. Les produits affichés sont ceux de la catégorie, et
 * le bouton mène à sa page complète (/categorie/<slug>).
 */
export const HomeSeasons: Block = {
  slug: 'homeSeasons',
  interfaceName: 'HomeSeasonsType',
  labels: {
    singular: 'Collections saisonnières',
    plural: 'Collections saisonnières',
  },
  fields: [
    {
      name: 'badge',
      type: 'text',
      localized: true,
      defaultValue: byLocale({ fr: 'Collections', ar: 'المجموعات', en: 'Collections' }),
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      defaultValue: byLocale({
        fr: 'Nos collections de saison',
        ar: 'مجموعاتنا الموسمية',
        en: 'Our seasonal collections',
      }),
    },
    {
      name: 'subtitle',
      type: 'textarea',
      localized: true,
      defaultValue: byLocale({
        fr: 'Été comme hiver, des pièces intemporelles pour chaque saison.',
        ar: 'صيفًا وشتاءً، قطع خالدة لكل موسم.',
        en: 'Summer or winter, timeless pieces for every season.',
      }),
    },
    {
      name: 'productsPerSeason',
      label: 'Aperçus produits par saison',
      type: 'number',
      defaultValue: 4,
      min: 0,
      max: 6,
      admin: { description: 'Petites pastilles photo affichées sur chaque panneau.' },
    },
    {
      name: 'seasons',
      label: 'Saisons',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 4,
      labels: { singular: 'Saison', plural: 'Saisons' },
      defaultValue: async ({ locale, req }: { locale?: string; req?: any }) => {
        const key = ((locale as keyof Copy) ?? 'fr') as keyof Copy

        // Catégories « ete » et « hiver » présélectionnées quand elles existent.
        let categoryBySlug: Record<string, string> = {}
        try {
          const { docs } = await req.payload.find({
            collection: 'categories',
            where: { slug: { in: SEASONS.map((season) => season.slug) } },
            depth: 0,
            limit: 10,
            select: { slug: true },
            req,
          })
          categoryBySlug = Object.fromEntries(docs.map((doc: any) => [doc.slug, doc.id]))
        } catch {
          // Sans accès aux catégories, l'admin les choisit à la main.
        }

        return SEASONS.map((season) => ({
          category: categoryBySlug[season.slug],
          label: season.label[key] ?? season.label.fr,
          description: season.description[key] ?? season.description.fr,
          buttonText: SEE_ALL[key] ?? SEE_ALL.fr,
        }))
      },
      fields: [
        {
          name: 'label',
          label: 'Nom de l’onglet',
          type: 'text',
          required: true,
          localized: true,
          admin: { description: 'Par exemple « Été » ou « Hiver ».' },
        },
        {
          name: 'category',
          label: 'Catégorie de la saison',
          type: 'relationship',
          relationTo: 'categories',
          required: true,
          admin: {
            description: 'Les produits rattachés à cette catégorie sont affichés dans l’onglet.',
          },
        },
        {
          name: 'image',
          label: 'Photo de fond (optionnelle)',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          admin: { description: 'Courte phrase affichée sur le panneau.' },
        },
        {
          name: 'buttonText',
          label: 'Texte du bouton',
          type: 'text',
          localized: true,
          defaultValue: byLocale(SEE_ALL),
        },
      ],
    },
  ],
}
