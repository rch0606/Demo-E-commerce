import { brand } from '@/brand.config'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { ShopSettings } from './globals/ShopSettings/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { Tags } from './collections/Tags'
import { Attributes } from './collections/Attributes'
import { AttributeValues } from './collections/AttributeValues'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { Variants } from './collections/Variants'
import { Categories } from './collections/Categories'
import { InventoryMovements } from './collections/InventoryMovements'
import { Customers } from './collections/Customers'
import { ChiffreAffaire } from './collections/ChiffreAffaire'
import { PromoCodes } from './collections/CodePromo'
import { CategoryPromos } from './collections/CategoryPromos'
import { sendBirthdayPromo } from './jobs/sendBirthdayPromo'
import { sendOrderReminders } from './jobs/sendOrderReminders'
import { cleanupRecordings } from './jobs/cleanupRecordings'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { Visits } from './collections/Visits'
import { Notifications } from './collections/Notifications'
import { Reviews } from './collections/Reviews'


const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  localization: {
    locales: [ 'fr', 'ar', 'en'], 
    defaultLocale: 'fr', 
  },
    admin: {
      // Thème clair uniquement : les styles admin (custom.scss) n'ont pas de variante sombre.
      theme: 'light',
      components: {
        beforeLogin: ['@/components/BeforeLogin'],
        beforeDashboard: ['@/components/BeforeDashboard'  ],
        beforeNavLinks: [
          '@/components/AdminNav',
        ],
        // Bell icon + dropdown in the admin header (top bar)
        actions: ['@/components/AdminNotifications'],
        graphics: {
          Logo: '@/components/AdminLogo/Logo',
          Icon: '@/components/AdminLogo/Icon',
        },
      },

      meta: {
        titleSuffix: `- ${brand.adminTitle}`,
        icons: [
          {
            rel: 'icon',
            type: 'image/svg+xml',
            url: brand.icon,
          },
        ],
      },

      importMap: {
        baseDir: path.resolve(dirname),
      },

      user: Users.slug,
      },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  collections: [
    Pages,
    Media,
    Categories,
    Users,
    Tags,
    Products,
    Attributes,
    AttributeValues,
    Orders,
    Variants,
    InventoryMovements,
    Customers,
    ChiffreAffaire,
    PromoCodes,
    CategoryPromos,
    Visits,
    Notifications,
    Reviews,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer, ShopSettings],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [sendBirthdayPromo, sendOrderReminders, cleanupRecordings],
    autoRun: [
      {
        cron: '*/5 * * * *', // check the queue every 5 minutes
        queue: 'birthdays',
        limit: 20,
      },
      {
        cron: '*/5 * * * *',
        queue: 'order-reminders',
        limit: 20,
      },
      {
        cron: '*/15 * * * *',
        queue: 'maintenance',
        limit: 5,
      },
    ],
  },

  // email: nodemailerAdapter({
  //   defaultFromAddress: process.env.SMTP_USER || '',
  //   defaultFromName: brand.name,
  //   transportOptions: {
  //     host: process.env.SMTP_HOST,
  //     port: parseInt(process.env.SMTP_PORT || '587'),
  //     secure: process.env.SMTP_SECURE === 'true',
  //     auth: {
  //       user: process.env.SMTP_USER,
  //       pass: process.env.SMTP_PASS,
  //     },
  //   },
  // }),
})
