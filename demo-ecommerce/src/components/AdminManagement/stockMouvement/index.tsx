'use client'

import React, { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Clock,
  Package,
  Tag,
  Filter,
  Download,
  FileText,
} from 'lucide-react'
import './index.css'

interface Movement {
  id: string
  movementType: string
  productTitle: string
  productId?: string
  variantTitle?: string | null
  variantSku?: string | null
  attributes?: { label: string; value: string }[]
  quantity: number
  beforeStock: number
  afterStock: number
  orderNumber?: string | null
  createdAt: string | null
  performedBy?: string | null
  reason?: string | null
}

interface FilterState {
  movementType: string
  productId: string
  dateFrom: string
  dateTo: string
}

export default function StockMovementHistory() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [filters, setFilters] = useState<FilterState>({
    movementType: '',
    productId: '',
    dateFrom: '',
    dateTo: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const limit = 20

  useEffect(() => {
    fetchMovements()
  }, [page, filters])

  async function fetchMovements() {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      params.append('limit', String(limit))
      params.append('page', String(page))
      params.append('sort', '-createdAt')
      params.append('depth', '3')

      if (filters.movementType) {
        params.append('where[movementType][equals]', filters.movementType)
      }
      if (filters.productId) {
        params.append('where[product][equals]', filters.productId)
      }
      if (filters.dateFrom) {
        params.append('where[createdAt][greater_than_equal]', new Date(filters.dateFrom).toISOString())
      }
      if (filters.dateTo) {
        params.append('where[createdAt][less_than_equal]', new Date(filters.dateTo).toISOString())
      }

      const res = await fetch(`/api/inventory-movements?${params.toString()}`)
      const data = await res.json()

      const isMongoId = (v: unknown) =>
        typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v.trim())

      const localizedText = (field: any): string => {
        if (!field) return ''
        if (typeof field === 'string') return field
        if (typeof field === 'object') {
          return (
            field.fr ||
            field.en ||
            field.ar ||
            Object.values(field).find((x) => typeof x === 'string' && x.trim()) ||
            ''
          )
        }
        return String(field)
      }

      const formatted = (data.docs || []).map((item: any) => {
        const product = item.product
        let productTitle = 'Produit'
        if (typeof product === 'object' && product !== null) {
          const t =
            localizedText(product.productTitle) ||
            localizedText(product.title) ||
            ''
          productTitle = t && !isMongoId(t) ? t : 'Produit'
        } else if (typeof product === 'string' && !isMongoId(product)) {
          productTitle = product
        }

        const variant = item.variant
        let variantTitle: string | null = null
        let variantSku: string | null = null

        if (typeof variant === 'object' && variant !== null) {
          const rawSku = variant.sku ? String(variant.sku) : null
          variantSku = rawSku && !isMongoId(rawSku) ? rawSku : null

          // Prefer combination labels (Taille: 3 ans) over internal ids
          if (variant.combination && Array.isArray(variant.combination)) {
            const parts = variant.combination
              .filter(Boolean)
              .map((combo: any) => {
                const attrObj =
                  typeof combo.attribute === 'object' ? combo.attribute : null
                const attrName =
                  localizedText(attrObj?.name) ||
                  localizedText(attrObj?.label) ||
                  localizedText(attrObj?.title) ||
                  ''
                const valueLabel =
                  localizedText(combo.label) ||
                  localizedText(combo.value) ||
                  ''
                if (isMongoId(valueLabel)) return ''
                return attrName ? `${attrName}: ${valueLabel}` : valueLabel
              })
              .filter(Boolean)

            if (parts.length > 0) {
              variantTitle = parts.join(' · ')
            }
          }

          if (!variantTitle) {
            const t =
              localizedText(variant.title) ||
              localizedText(variant.name) ||
              variantSku ||
              ''
            variantTitle = t && !isMongoId(t) ? t : null
          }
        }
        // If variant is only an id string — ignore (never show Mongo id)

        let attributes: { label: string; value: string }[] = []

        if (item.productAttributes && Array.isArray(item.productAttributes)) {
          attributes = item.productAttributes
            .filter((attr: any) => attr !== null)
            .map((attr: any) => {
              const attrObj = typeof attr === 'object' ? attr : null
              const label =
                localizedText(attrObj?.attribute?.name) ||
                localizedText(attrObj?.attribute?.label) ||
                localizedText(attrObj?.label) ||
                ''
              const value =
                localizedText(attrObj?.label) ||
                localizedText(attrObj?.value) ||
                (typeof attr === 'string' && !isMongoId(attr) ? attr : '') ||
                ''
              return {
                label: isMongoId(label) ? '' : label,
                value: isMongoId(value) ? '' : value,
              }
            })
            .filter((a: { label: string; value: string }) => a.label || a.value)
        }

        const order = item.order
        const orderNumber = typeof order === 'object'
          ? (order.orderNumber || order.id)
          : (order || null)

        const performedBy = typeof item.performedBy === 'object'
          ? (item.performedBy.name || item.performedBy.email || item.performedBy.id)
          : null

        return {
          id: item.id,
          movementType: item.movementType || '',
          productTitle,
          productId: typeof product === 'object' ? product.id : product,
          variantTitle,
          variantSku,
          attributes,
          quantity: item.quantity || 0,
          beforeStock: item.beforeStock || 0,
          afterStock: item.afterStock || 0,
          orderNumber,
          createdAt: item.createdAt,
          performedBy,
          reason: item.reason || null,
        }
      })

      setMovements(formatted)
      setTotalPages(data.totalPages || 1)
      setTotalDocs(data.totalDocs || 0)
    } catch (error) {
      console.error('❌ Error fetching movements:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDateTime(value: string | null) {
    if (!value) return '-'
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatNumber(value: number) {
    return new Intl.NumberFormat('fr-FR').format(value)
  }

  function getMovementLabel(type: string) {
    const labels: Record<string, string> = {
      stock_entry: 'Entrée de stock',
      stock_exit: 'Sortie de stock',
      order_deduct: 'Sortie commande',
      order_restore: 'Retour commande',
      manual_adjustment: 'Ajustement manuel',
      variant_recalc: 'Recalcul variantes',
      customer_return: 'Retour client',
    }
    return labels[type] || type.replace(/_/g, ' ')
  }

  function getMovementBadgeClass(type: string) {
    switch (type) {
      case 'stock_entry':
      case 'order_restore':
      case 'customer_return':
        return 'badge-success'
      case 'stock_exit':
      case 'order_deduct':
        return 'badge-danger'
      default:
        return 'badge-neutral'
    }
  }

  function getDirection(type: string) {
    switch (type) {
      case 'stock_entry':
      case 'order_restore':
      case 'customer_return':
        return 'in'
      case 'stock_exit':
      case 'order_deduct':
        return 'out'
      default:
        return 'neutral'
    }
  }

  function formatVariantCell(m: {
    variantTitle?: string | null
    variantSku?: string | null
    attributes?: { label: string; value: string }[]
  }) {
    // Human-readable only — never Mongo ObjectIds
    const isMongoId = (v: unknown) =>
      typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v.trim())

    const parts: string[] = []
    if (m.variantTitle && !isMongoId(m.variantTitle)) {
      parts.push(m.variantTitle)
    }
    if (m.variantSku && !isMongoId(m.variantSku)) {
      parts.push(`SKU: ${m.variantSku}`)
    }
    if (m.attributes && m.attributes.length > 0) {
      const attrText = m.attributes
        .map((a) => {
          const label = a.label && !isMongoId(a.label) ? a.label : ''
          const value = a.value && !isMongoId(a.value) ? String(a.value) : ''
          if (label && value) return `${label}: ${value}`
          return value || label || ''
        })
        .filter(Boolean)
        .join(' · ')
      if (attrText) parts.push(attrText)
    }
    // Dedupe if variantTitle already equals attributes text
    const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))]
    return unique.join(' · ') || '—'
  }

  function csvEscape(value: unknown) {
    const s = String(value ?? '')
    return `"${s.replace(/"/g, '""')}"`
  }

  function handleExport() {
    const headers = [
      'Date',
      'Type',
      'Produit',
      'Variante',
      'SKU variante',
      'Quantité',
      'Avant',
      'Après',
      'Commande',
      'Effectué par',
      'Raison',
    ]

    const isMongoId = (v: unknown) =>
      typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v.trim())

    const rows = movements.map((m) => [
      formatDateTime(m.createdAt),
      getMovementLabel(m.movementType),
      m.productTitle && !isMongoId(m.productTitle) ? m.productTitle : 'Produit',
      // One Variante column only (no separate Attributs)
      formatVariantCell(m),
      m.variantSku && !isMongoId(m.variantSku) ? m.variantSku : '—',
      String(m.quantity),
      String(m.beforeStock),
      String(m.afterStock),
      m.orderNumber || '—',
      m.performedBy || '—',
      m.reason || '—',
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mouvements-stock-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleExportPdf() {
    const rows = movements
      .map((m) => {
        const variant = formatVariantCell(m)
        return `
        <tr>
          <td style="padding:6px 8px;border:1px solid #eceaf8;font-size:12px;">${formatDateTime(m.createdAt)}</td>
          <td style="padding:6px 8px;border:1px solid #eceaf8;font-size:12px;">${getMovementLabel(m.movementType)}</td>
          <td style="padding:6px 8px;border:1px solid #eceaf8;font-size:12px;">${m.productTitle || '—'}</td>
          <td style="padding:6px 8px;border:1px solid #eceaf8;font-size:12px;">${variant}</td>
          <td style="padding:6px 8px;border:1px solid #eceaf8;text-align:center;font-size:12px;">${m.quantity}</td>
          <td style="padding:6px 8px;border:1px solid #eceaf8;text-align:center;font-size:12px;">${m.beforeStock} → ${m.afterStock}</td>
          <td style="padding:6px 8px;border:1px solid #eceaf8;font-size:12px;">${m.orderNumber || '—'}</td>
        </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mouvements de stock</title>
<style>
  body{font-family:Segoe UI,Tahoma,sans-serif;color:#2a2540;padding:28px;max-width:1000px;margin:0 auto}
  h1{font-size:22px;color:#8a7de8;margin-bottom:4px}
  .sub{font-size:13px;color:#6e6a88;margin-bottom:20px}
  table{width:100%;border-collapse:collapse}
  th{background:#f7f6ff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#6e6a88;border:1px solid #eceaf8}
  td{border:1px solid #eceaf8;vertical-align:top}
</style></head><body>
  <h1>Mouvements de stock</h1>
  <div class="sub">${totalDocs} mouvement(s) · exporté le ${new Date().toLocaleDateString('fr-FR')}</div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Type</th><th>Produit</th><th>Variante</th>
        <th>Qté</th><th>Stock</th><th>Commande</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`

    const w = window.open('', '_blank', 'width=1000,height=700')
    if (w) {
      w.document.write(html)
      w.document.close()
      w.focus()
      setTimeout(() => {
        w.print()
        w.onafterprint = () => w.close()
      }, 400)
    }
  }

  return (
    <div className="sh-panel">
      {/* Header */}
      <div className="sh-panel-header">
        <div>
          <h3 className="sh-panel-title">Historique complet des mouvements</h3>
          <p className="sh-panel-subtitle">
            {totalDocs} mouvement{totalDocs !== 1 ? 's' : ''} enregistré{totalDocs !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="sh-panel-actions">
          <button
            className="sh-btn sh-btn-outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} />
            Filtres
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-outline"
            onClick={handleExport}
          >
            <Download size={14} />
            Exporter CSV
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-outline"
            onClick={handleExportPdf}
          >
            <FileText size={14} />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="sh-filters">
          <div className="sh-filters-row">
            <select
              value={filters.movementType}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, movementType: e.target.value }))
                setPage(1)
              }}
              className="sh-filter-select"
            >
              <option value="">Tous les types</option>
              <option value="stock_entry">Entrée de stock</option>
              <option value="stock_exit">Sortie de stock</option>
              <option value="order_deduct">Sortie commande</option>
              <option value="order_restore">Retour commande</option>
              <option value="manual_adjustment">Ajustement manuel</option>
              <option value="customer_return">Retour client</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, dateFrom: e.target.value }))
                setPage(1)
              }}
              className="sh-filter-input"
              placeholder="Date début"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, dateTo: e.target.value }))
                setPage(1)
              }}
              className="sh-filter-input"
              placeholder="Date fin"
            />

            {(filters.movementType || filters.dateFrom || filters.dateTo) && (
              <button
                className="sh-btn sh-btn-sm sh-btn-ghost"
                onClick={() => {
                  setFilters({ movementType: '', productId: '', dateFrom: '', dateTo: '' })
                  setPage(1)
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="sh-loading">
          <div className="sh-spinner" />
          <p>Chargement de l'historique...</p>
        </div>
      ) : movements.length === 0 ? (
        <div className="sh-empty">
          <Clock size={40} />
          <p>Aucun mouvement de stock trouvé</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="sh-table-container">
            <table className="sh-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Produit</th>
                  <th>Variante</th>
                  <th>Qté</th>
                  <th>Stock avant</th>
                  <th>Stock après</th>
                  <th>Commande</th>
                  <th>Effectué par</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const direction = getDirection(movement.movementType)
                  return (
                    <tr key={movement.id}>
                      <td className="sh-cell-date">{formatDateTime(movement.createdAt)}</td>
                      <td>
                        <span className={`sh-badge ${getMovementBadgeClass(movement.movementType)}`}>
                          {getMovementLabel(movement.movementType)}
                        </span>
                      </td>
                      <td>
                        <div className="sh-cell-product">
                          <Package size={14} />
                          <span>{movement.productTitle}</span>
                        </div>
                      </td>
                      <td className="sh-cell-variant">
                        {movement.variantTitle ? (
                          <span className="sh-variant-text">
                            <Tag size={12} />
                            {movement.variantTitle}
                          </span>
                        ) : movement.attributes && movement.attributes.length > 0 ? (
                          <span className="sh-variant-text">
                            {movement.attributes.map((attr, idx) => (
                              <span key={idx}>
                                {attr.label}: {attr.value}
                                {idx < movement.attributes!.length - 1 ? ' · ' : ''}
                              </span>
                            ))}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <span className={`sh-qty ${direction === 'in' ? 'sh-qty-in' : direction === 'out' ? 'sh-qty-out' : ''}`}>
                          {direction === 'in' ? '+' : direction === 'out' ? '-' : ''}
                          {formatNumber(movement.quantity)}
                        </span>
                      </td>
                      <td>{formatNumber(movement.beforeStock)}</td>
                      <td>{formatNumber(movement.afterStock)}</td>
                      <td>{movement.orderNumber || '-'}</td>
                      <td className="sh-cell-user">{movement.performedBy || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="sh-pagination">
            <span className="sh-pagination-info">
              Page {page} sur {totalPages} · {totalDocs} résultats
            </span>
            <div className="sh-pagination-buttons">
              <button
                className="sh-btn sh-btn-sm sh-btn-outline"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Précédent
              </button>
              <button
                className="sh-btn sh-btn-sm sh-btn-outline"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Suivant →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}