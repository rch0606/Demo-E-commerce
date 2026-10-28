import { notifyAdmins } from '@/utilities/notifyAdmins'
import type { CollectionAfterChangeHook } from 'payload'


/** Orders above this amount also trigger a "high value" notification */
const HIGH_VALUE_THRESHOLD = 200 // TND — adjust as needed

/**
 * After an order is created with status "new":
 * 1. Notify admin/owner by email + in-app
 * 2. If total is high, send an extra high-value alert
 *
 * Safe: never throws so it cannot block order creation.
 */
export const notifyOnNewOrder: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  try {
    // --- New order ---
    if (operation === 'create' && doc.status === 'new') {
      await notifyAdmins({
        type: 'new_order',
        order: doc,
        req,
        roles: ['owner', 'admin', 'sales'],
        createInApp: true,
      })

      const total = Number(doc.totalAmount) || 0
      if (total >= HIGH_VALUE_THRESHOLD) {
        await notifyAdmins({
          type: 'high_value_order',
          order: doc,
          req,
          roles: ['owner', 'admin', 'sales'],
          createInApp: true,
          extraMessage: `Montant ≥ ${HIGH_VALUE_THRESHOLD} TND — priorité recommandée.`,
        })
      }
    }

    // --- Status change (optional alerts) ---
    if (
      operation === 'update' &&
      previousDoc &&
      previousDoc.status !== doc.status &&
      (doc.status === 'cancelled' || doc.status === 'returned')
    ) {
      await notifyAdmins({
        type: 'status_change',
        order: doc,
        req,
        roles: ['owner', 'admin', 'sales'],
        createInApp: true,
        extraMessage: `Statut passé de « ${previousDoc.status} » à « ${doc.status} ».`,
      })
    }
  } catch (err: any) {
    // Never block the order flow
    req.payload.logger.error({
      msg: '[notifyOnNewOrder] Failed',
      err: err?.message || err,
    })
  }

  return doc
}
