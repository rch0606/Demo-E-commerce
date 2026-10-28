import type { TaskConfig } from 'payload'
import { notifyAdmins } from '../utilities/notifyAdmins'

const REMINDER_AFTER_HOURS = 2

export const sendOrderReminders = {
  slug: 'sendOrderReminders',

  outputSchema: [
    {
      name: 'message',
      type: 'text',
      required: true,
    },
    {
      name: 'remindedCount',
      type: 'number',
    },
  ],

  // Queue this task every hour. Handler still enforces:
  // - order older than 2h
  // - status === 'new'
  // - reminderSentAt empty → send at most once (no spam)
  schedule: [
    {
      cron: '0 * * * *', // every hour at :00
      queue: 'order-reminders',
    },
  ],

  retries: 1,

  handler: async ({ req }: { req: { payload: any } }) => {
    const { payload } = req

    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - REMINDER_AFTER_HOURS)

    // Only "new" orders older than cutoff that have never been reminded
    const pending = await payload.find({
      collection: 'orders',
      where: {
        and: [
          { status: { equals: 'new' } },
          { createdAt: { less_than: cutoff.toISOString() } },
          {
            or: [
              { reminderSentAt: { exists: false } },
              { reminderSentAt: { equals: null } },
            ],
          },
        ],
      },
      limit: 50,
      depth: 0,
      sort: 'createdAt',
      overrideAccess: true,
    })

    let remindedCount = 0
    const errors: string[] = []

    for (const order of pending.docs) {
      try {
        await notifyAdmins({
          type: 'order_reminder',
          order,
          payload,
          roles: ['owner', 'admin', 'sales'],
          createInApp: true,
        })

        // Mark as reminded so the next cron run skips this order
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            reminderSentAt: new Date().toISOString(),
          },
          overrideAccess: true,
          context: { skipNotification: true },
        })

        remindedCount++
      } catch (err: any) {
        const msg = `Reminder failed for ${order.orderNumber}: ${err?.message || err}`
        errors.push(msg)
        payload.logger.error(msg)
      }
    }

    return {
      output: {
        message: `Order reminders sent: ${remindedCount}${errors.length ? ` (${errors.length} errors)` : ''}`,
        remindedCount,
      },
    }
  },
} as unknown as TaskConfig
