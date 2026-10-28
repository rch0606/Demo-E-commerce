import { brand } from '@/brand.config'
import type { Payload, PayloadRequest } from 'payload'
import { getServerSideURL } from './getURL'

export type NotifyType = 'new_order' | 'order_reminder' | 'high_value_order' | 'status_change'

type OrderLike = {
  id: string | number
  orderNumber?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerGouvernorat?: string | null
  totalAmount?: number | null
  source?: string | null
  status?: string | null
  items?:
    | {
        title?: string | null
        attributes?: string | null
        quantity?: number | null
        price?: number | null
        subtotal?: number | null
      }[]
    | null
  createdAt?: string | null
}

type NotifyOptions = {
  type: NotifyType
  order: OrderLike
  req?: PayloadRequest
  payload?: Payload
  /** Optional extra note shown in the email */
  extraMessage?: string
  /** Roles that should receive the notification (default: admin + owner) */
  roles?: Array<'owner' | 'admin' | 'sales'>
  /** Also create in-app Notification documents */
  createInApp?: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  boutique: 'Boutique',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nouvelle',
  validated: 'Validée',
  cancelled: 'Annulée',
  returned: 'Retournée',
}

function formatMoney(amount?: number | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `${Number(amount).toFixed(2)} TND`
}

function buildOrderItemsHtml(order: OrderLike): string {
  const items = order.items || []
  if (!items.length) return '<p style="color:#666;">Aucun détail d’articles.</p>'

  const rows = items
    .map((item) => {
      const name = item.title || 'Produit'
      const attrs = item.attributes ? ` <span style="color:#666;">(${item.attributes})</span>` : ''
      const qty = item.quantity ?? 1
      const sub = formatMoney(item.subtotal ?? (item.price != null ? item.price * qty : null))
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${name}${attrs}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${sub}</td>
      </tr>`
    })
    .join('')

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead>
        <tr style="background:#fdf2f8;">
          <th style="padding:8px 12px;text-align:left;">Article</th>
          <th style="padding:8px 12px;text-align:center;">Qté</th>
          <th style="padding:8px 12px;text-align:right;">Sous-total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

function buildEmailContent(
  type: NotifyType,
  order: OrderLike,
  extraMessage?: string,
): { subject: string; html: string } {
  const ref = order.orderNumber || String(order.id)
  const adminUrl = `${getServerSideURL()}/admin/collections/orders/${order.id}`
  const source = SOURCE_LABELS[order.source || ''] || order.source || '—'
  const status = STATUS_LABELS[order.status || ''] || order.status || '—'

  let subject = ''
  let title = ''
  let intro = ''

  switch (type) {
    case 'new_order':
      subject = `🛒 Nouvelle commande ${ref} – action requise`
      title = 'Nouvelle commande'
      intro =
        'Une nouvelle commande vient d’être soumise. Merci de contacter le client et de mettre à jour le statut.'
      break
    case 'order_reminder':
      subject = `⏰ Rappel : commande ${ref} toujours en attente`
      title = 'Commande en attente'
      intro =
        'Cette commande est toujours au statut « Nouvelle ». Merci de la traiter rapidement.'
      break
    case 'high_value_order':
      subject = `⭐ Commande importante ${ref} – ${formatMoney(order.totalAmount)}`
      title = 'Commande à forte valeur'
      intro = 'Une commande à montant élevé vient d’être créée. Priorité recommandée.'
      break
    case 'status_change':
      subject = `Statut mis à jour – ${ref} → ${status}`
      title = 'Changement de statut'
      intro = `Le statut de la commande a été mis à jour : <strong>${status}</strong>.`
      break
    default:
      subject = `Notification commande ${ref}`
      title = 'Notification'
      intro = 'Mise à jour concernant une commande.'
  }

  const extra = extraMessage
    ? `<p style="background:#fff7ed;border-left:4px solid #f97316;padding:12px;margin:16px 0;">${extraMessage}</p>`
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:#bb5333;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">${title}</h1>
        <p style="margin:8px 0 0;opacity:0.9;">${brand.name} – Administration</p>
      </div>
      <div style="border:1px solid #f3e8ee;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <p>${intro}</p>
        ${extra}
        <table style="width:100%;font-size:14px;margin:16px 0;">
          <tr>
            <td style="padding:6px 0;color:#666;width:140px;">Référence</td>
            <td style="padding:6px 0;"><strong>${ref}</strong></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Client</td>
            <td style="padding:6px 0;">${order.customerName || '—'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Téléphone</td>
            <td style="padding:6px 0;"><a href="tel:${order.customerPhone || ''}">${order.customerPhone || '—'}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Email</td>
            <td style="padding:6px 0;">${order.customerEmail || '—'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Gouvernorat</td>
            <td style="padding:6px 0;">${order.customerGouvernorat || '—'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Total</td>
            <td style="padding:6px 0;"><strong>${formatMoney(order.totalAmount)}</strong></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Source</td>
            <td style="padding:6px 0;">${source}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Statut</td>
            <td style="padding:6px 0;">${status}</td>
          </tr>
        </table>
        ${buildOrderItemsHtml(order)}
        <p style="margin-top:24px;">
          <a href="${adminUrl}"
             style="display:inline-block;background:#bb5333;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;">
            Ouvrir la commande
          </a>
        </p>
        <p style="margin-top:24px;font-size:12px;color:#999;">
          Cet email a été envoyé automatiquement par le tableau de bord ${brand.name}.
        </p>
      </div>
    </div>
  `

  return { subject, html }
}


export async function notifyAdmins(options: NotifyOptions): Promise<{ emailed: number; inApp: number }> {
  const {
    type,
    order,
    extraMessage,
    roles = ['owner', 'admin', 'sales'],
    createInApp = true,
  } = options

  const payload = options.payload || options.req?.payload
  if (!payload) {
    console.error('[notifyAdmins] No payload instance provided')
    return { emailed: 0, inApp: 0 }
  }

  let emailed = 0
  let inApp = 0

  try {
    const usersResult = await payload.find({
      collection: 'users',
      where: {
        role: {
          in: roles,
        },
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    })

    const users = usersResult.docs
    if (!users.length) {
      payload.logger.warn('[notifyAdmins] No users found for roles: ' + roles.join(', '))
      return { emailed: 0, inApp: 0 }
    }

    // 1) In-app first — must work even when SMTP is down
    if (createInApp) {
      const titleMap: Record<NotifyType, string> = {
        new_order: `Nouvelle commande ${order.orderNumber || order.id}`,
        order_reminder: `Rappel : ${order.orderNumber || order.id} en attente`,
        high_value_order: `Commande importante ${order.orderNumber || order.id}`,
        status_change: `Statut mis à jour – ${order.orderNumber || order.id}`,
      }

      const messageMap: Record<NotifyType, string> = {
        new_order: `${order.customerName || 'Client'} – ${formatMoney(order.totalAmount)} – ${order.customerPhone || ''}`,
        order_reminder: `Toujours au statut Nouvelle. Contacter le client.`,
        high_value_order: `Montant élevé : ${formatMoney(order.totalAmount)}`,
        status_change: `Nouveau statut : ${STATUS_LABELS[order.status || ''] || order.status}`,
      }

      for (const user of users) {
        try {
          await payload.create({
            collection: 'notifications',
            data: {
              type,
              title: titleMap[type],
              message: messageMap[type],
              order: String(order.id),
              user: String(user.id),
              read: false,
            },
            overrideAccess: true,
          })
          inApp++
        } catch (err: any) {
          payload.logger.error(
            `[notifyAdmins] Failed to create in-app notification for user ${user.id}: ${err?.message || err}`,
          )
        }
      }
    }

    // 2) Emails — optional; never blocks in-app (SMTP often broken in local/dev)
    const emailUsers = users.filter((u) => Boolean(u.email))
    if (emailUsers.length) {
      const { subject, html } = buildEmailContent(type, order, extraMessage)
      for (const user of emailUsers) {
        try {
          await payload.sendEmail({
            to: user.email as string,
            subject,
            html,
          })
          emailed++
        } catch (err: any) {
          // ECONNREFUSED / bad SMTP → log once-style warning, continue
          payload.logger.warn(
            `[notifyAdmins] Email skipped for ${user.email}: ${err?.message || err}`,
          )
        }
      }
    }

    payload.logger.info(
      `[notifyAdmins] type=${type} order=${order.orderNumber || order.id} emailed=${emailed} inApp=${inApp}`,
    )
  } catch (err: any) {
    payload.logger.error(`[notifyAdmins] Unexpected error: ${err?.message || err}`)
  }

  return { emailed, inApp }
}
