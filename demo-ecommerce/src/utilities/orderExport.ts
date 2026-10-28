
export interface OrderItem {
  id?: string
  productId?: string
  variantId?: string
  title?: string
  attributes?: string | { attribute?: string; value?: string }[]
  quantity?: number
  price?: number
  /** Prix avant remise, figé à la commande. Absent si aucune promotion. */
  oldPrice?: number
  subtotal?: number
}

export interface OrderData {
  id?: string
  orderNumber?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  customerGouvernorat?: string
  quantity?: number
  totalAmount?: number
  source?: string
  status?: string
  note?: string
  promoCode?: string | null
  createdAt?: string
  updatedAt?: string
  product?: any
  author?: any
  items?: OrderItem[]
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Nouvelle',
  validated: 'Validée',
  cancelled: 'Annulée',
  returned: 'Retournée',
}

const SOURCE_LABELS: Record<string, string> = {
  website: 'Site Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  boutique: 'Boutique',
}

/** Normalize attributes for PDF/CSV (string or array of {attribute,value}) */
export function formatItemAttributes(
  attributes?: OrderItem['attributes'],
): string {
  if (!attributes) return '—'
  if (typeof attributes === 'string') {
    const t = attributes.trim()
    return t || '—'
  }
  if (Array.isArray(attributes)) {
    const parts = attributes
      .map((a: any) => {
        if (!a) return ''
        if (typeof a === 'string') return a
        const name =
          typeof a.attribute === 'object'
            ? a.attribute?.label || a.attribute?.name || a.attribute?.title
            : a.attribute
        const value =
          typeof a.value === 'object'
            ? a.value?.label || a.value?.name || a.value?.value
            : a.value
        if (name && value != null && value !== '') return `${name}: ${value}`
        if (value != null && value !== '') return String(value)
        return ''
      })
      .filter(Boolean)
    return parts.length ? parts.join(' · ') : '—'
  }
  return '—'
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function csvCell(value: unknown): string {
  const s = String(value ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

export function generateCSV(order: OrderData, items: OrderItem[]): string {
  const statusLabel = ORDER_STATUS_LABELS[order.status || ''] || order.status
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  const headers = [
    'Référence',
    'Client',
    'Téléphone',
    'Email',
    'Adresse',
    'Gouvernorat',
    'Total',
    'Statut',
    'Source',
    'Promo',
    'Date',
    'Note',
  ].join(',')

  const orderRow = [
    order.orderNumber || '',
    order.customerName || '',
    order.customerPhone || '',
    order.customerEmail || '',
    order.customerAddress || '',
    order.customerGouvernorat || '',
    `${Number(order.totalAmount || 0).toFixed(2)} DT`,
    statusLabel,
    SOURCE_LABELS[order.source || ''] || order.source || '',
    order.promoCode || '',
    dateStr,
    order.note || '',
  ]
    .map(csvCell)
    .join(',')

  let csv = headers + '\n' + orderRow + '\n\n'
  csv += 'Produits:\n'
  csv +=
    'Produit,Options / attributs,Prix unitaire,Quantité,Sous-total\n'

  items.forEach((item) => {
    const attrs = formatItemAttributes(item.attributes)
    const price = Number(item.price || 0)
    const qty = Number(item.quantity || 1)
    const sub = Number(item.subtotal ?? price * qty)
    csv +=
      [
        item.title || 'Produit',
        attrs,
        `${price.toFixed(2)} DT`,
        qty,
        `${sub.toFixed(2)} DT`,
      ]
        .map(csvCell)
        .join(',') + '\n'
  })

  csv += `\n${csvCell('Total')},,,,${csvCell(
    `${Number(order.totalAmount || 0).toFixed(2)} DT`,
  )}\n`

  return csv
}

export function downloadCSV(order: OrderData, items: OrderItem[]): void {
  const csv = generateCSV(order, items)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${order.orderNumber || 'commande'}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function generatePDFHTML(
  order: OrderData,
  items: OrderItem[],
  displayAuthor: string | null,
): string {
  const statusLabel = ORDER_STATUS_LABELS[order.status || ''] || order.status
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  const itemsRows = items
    .map((item) => {
      const attrs = formatItemAttributes(item.attributes)
      const price = Number(item.price || 0)
      const qty = Number(item.quantity || 1)
      const sub = Number(item.subtotal ?? price * qty)
      // Do not print raw Mongo variant ids — human options are in the Options column

      return `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">
          <div style="font-weight:600;">${escapeHtml(item.title || 'Produit')}</div>
        </td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(attrs)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${price.toFixed(2)} DT</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">×${qty}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${sub.toFixed(2)} DT</td>
      </tr>`
    })
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(order.orderNumber || 'Commande')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1f2937;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 30px;
      border-bottom: 3px solid #7c6ff0;
      padding-bottom: 20px;
    }
    .header h1 { font-size: 28px; color: #7c6ff0; }
    .header .ref { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .status {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      background: #eae6fc;
      color: #5b4fcf;
    }
    .section { margin-bottom: 24px; }
    .section h2 {
      font-size: 16px;
      color: #7c6ff0;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .grid { display: flex; gap: 40px; margin-bottom: 20px; }
    .col { flex: 1; }
    .field { margin-bottom: 12px; }
    .field label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .field span { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th {
      background: #f3f4f6;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      border: 1px solid #e5e7eb;
    }
    td { border: 1px solid #e5e7eb; vertical-align: top; }
    .total-row td {
      font-weight: 700;
      font-size: 16px;
      background: #faf9ff;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #a9a6bd;
      border-top: 1px solid #e5e7eb;
      padding-top: 16px;
    }
    .note-box {
      background: #faf9ff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: #374151;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(order.orderNumber || 'Commande')}</h1>
      <div class="ref">Date : ${escapeHtml(dateStr)}</div>
    </div>
    <div class="status">${escapeHtml(statusLabel || '')}</div>
  </div>

  <div class="grid">
    <div class="col">
      <div class="section">
        <h2>Client</h2>
        <div class="field"><label>Nom</label><span>${escapeHtml(order.customerName || '-')}</span></div>
        <div class="field"><label>Téléphone</label><span>${escapeHtml(order.customerPhone || '-')}</span></div>
        <div class="field"><label>Email</label><span>${escapeHtml(order.customerEmail || '-')}</span></div>
        <div class="field"><label>Adresse</label><span>${escapeHtml(order.customerAddress || '-')}</span></div>
        <div class="field"><label>Gouvernorat</label><span>${escapeHtml(order.customerGouvernorat || '-')}</span></div>
      </div>
    </div>
    <div class="col">
      <div class="section">
        <h2>Détails</h2>
        <div class="field"><label>Source</label><span>${escapeHtml(SOURCE_LABELS[order.source || ''] || order.source || '-')}</span></div>
        <div class="field"><label>Total</label><span style="font-size:20px;font-weight:700;color:#7c6ff0;">${Number(order.totalAmount || 0).toFixed(2)} DT</span></div>
        <div class="field"><label>Quantité</label><span>${escapeHtml(String(order.quantity || 0))}</span></div>
        ${order.promoCode ? `<div class="field"><label>Code promo</label><span>${escapeHtml(order.promoCode)}</span></div>` : ''}
        ${displayAuthor ? `<div class="field"><label>Responsable</label><span>${escapeHtml(displayAuthor)}</span></div>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Produits (${items.length} article(s))</h2>
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th>Options / variante</th>
          <th style="text-align:right;">Prix unitaire</th>
          <th style="text-align:center;">Qté</th>
          <th style="text-align:right;">Sous-total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="4" style="text-align:right;padding:10px 12px;">Total</td>
          <td style="text-align:right;padding:10px 12px;color:#7c6ff0;">${Number(order.totalAmount || 0).toFixed(2)} DT</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${order.note ? `<div class="section"><h2>Note</h2><div class="note-box">${escapeHtml(order.note)}</div></div>` : ''}

  <div class="footer">
    Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
  </div>
</body>
</html>`
}

export function downloadPDF(
  order: OrderData,
  items: OrderItem[],
  displayAuthor: string | null,
): void {
  const html = generatePDFHTML(order, items, displayAuthor)

  const printWindow = window.open('', '_blank', 'width=800,height=600')

  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => {
        printWindow.close()
      }
    }, 500)
  } else {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${order.orderNumber || 'commande'}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }
}
