import { brand } from '@/brand.config'
import type { TaskConfig } from 'payload'
import { generateUniquePromoCode } from '../collections/CodePromo/hooks/generatePromoCode'

/**
 * Birthday promo emails – runs every day at 08:00 Tunisia time (Africa/Tunis = UTC+1)
 *
 * Cron explanation:
 *   0 7 * * *  → 07:00 UTC = 08:00 Africa/Tunis
 */
export const sendBirthdayPromo: TaskConfig<'sendBirthdayPromo'> = {
  slug: 'sendBirthdayPromo',

  outputSchema: [
    {
      name: 'message',
      type: 'text',
      required: true,
    },
    {
      name: 'sentCount',
      type: 'number',
    },
  ],

  schedule: [
    {
      cron: '0 7 * * *', // 08:00 Tunisia time
      queue: 'birthdays',
    },
  ],

  retries: 2,

  handler: async ({ req }) => {
    const { payload } = req

    // Force Tunisia timezone so the "today" date is always correct
    const tunisiaNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Tunis' }),
    )
    const todayMonth = tunisiaNow.getMonth() // 0-11
    const todayDay = tunisiaNow.getDate()
    const currentYear = tunisiaNow.getFullYear()

    // Fetch all customers that have at least one child birth date + an email
    const customers = await payload.find({
      collection: 'customers',
      where: {
        and: [
          {
            email: {
              exists: true,
            },
          },
          {
            'childrenBirthDates.date': {
              exists: true,
            },
          },
        ],
      },
      limit: 5000,
      depth: 0,
    })

    let sentCount = 0
    const errors: string[] = []

    for (const customer of customers.docs) {
      if (!customer.email) continue

      // Skip if we already sent a birthday promo this year
      const lastSent = customer.lastBirthdayPromoSent
        ? new Date(customer.lastBirthdayPromoSent as string)
        : null

      if (lastSent && lastSent.getFullYear() === currentYear) {
        continue
      }

      const children = (customer.childrenBirthDates as { date?: string }[]) || []

      // Check if ANY child has birthday today
      const hasBirthdayToday = children.some((child) => {
        if (!child.date) return false
        const birth = new Date(child.date)
        return birth.getMonth() === todayMonth && birth.getDate() === todayDay
      })

      if (!hasBirthdayToday) continue

      try {
        // 1. Create a unique birthday promo code (valid 7 days)
        const promoCode = await generateUniquePromoCode(8)

        const startDate = new Date(tunisiaNow)
        startDate.setHours(0, 0, 0, 0)

        const endDate = new Date(tunisiaNow)
        endDate.setDate(endDate.getDate() + 1)
        endDate.setHours(23, 59, 59, 999)

        await payload.create({
          collection: 'promo-codes',
          data: {
            promoCode,
            description: `Anniversaire – ${customer.name || customer.email}`,
            active: true,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            discountType: 'percentage',
            discountValue: 20, // ← change the discount % here
            usageCodeLimit: 1, // one-time use
            minOrderValue: 0,
          },
          overrideAccess: true,
        })

        // 2. Send the email
        await payload.sendEmail({
          to: customer.email,
          subject: `🎉 Joyeux anniversaire ! Voici votre code promo`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #bb5333;">Joyeux anniversaire ! 🎂</h2>
              <p>Bonjour ${customer.name || ''},</p>
              <p>
                Aujourd'hui est un jour spécial pour vous.
                Pour célébrer, nous vous offrons un code promo exclusif :
              </p>
              <div style="background: #fff6f2; border: 2px dashed #bb5333; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #bb5333;">
                  ${promoCode}
                </span>
              </div>
              <p>
                <strong>20% de réduction</strong> – valable aujourd'hui et demain<br/>
                Utilisable une seule fois.
              </p>
              <p>Profitez-en bien !</p>
              <p style="margin-top: 32px; color: #666;">
                L'équipe ${brand.name}
              </p>
            </div>
          `,
        })

        // 3. Mark as sent so we never send again this year
        await payload.update({
          collection: 'customers',
          id: customer.id,
          data: {
            lastBirthdayPromoSent: tunisiaNow.toISOString(),
          },
          overrideAccess: true,
        })

        sentCount++
        payload.logger.info(
          `[Birthday] Promo sent to ${customer.email} → ${promoCode}`,
        )
      } catch (err: any) {
        const msg = `Failed for ${customer.email}: ${err.message}`
        errors.push(msg)
        payload.logger.error(msg)
      }
    }

    return {
      output: {
        message: `Birthday emails sent: ${sentCount}${errors.length ? ` (${errors.length} errors)` : ''}`,
        sentCount,
      },
    }
  },
}
