'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Package,
  Trash2,
  ArrowLeft,
  User,
  Receipt,
  ShoppingBag,
  Gift,
  Pencil,
  Save,
} from 'lucide-react'

import './index.css'
import type { OrderItem } from '@/utilities/orderExport'
import { formatItemAttributes } from '@/utilities/orderExport'
import ExportOrderButton from '@/components/ExportButton'

// ============================================
// TYPES
// ============================================

interface PopulatedProduct {
  id: string
  productTitle?: string
  currentPrice?: number
}

interface OrderEditProps {
  id: string
  order: any
  /** Owner / admin only — show visit session link */
  canSeeVisitSession?: boolean
}

// ============================================
// CONSTANTS
// ============================================

const ORDER_STATUS = {
  new: { label: 'Nouvelle', icon: PlusCircle, class: 'status-new', colorClass: 'status-new-color' },
  validated: { label: 'Validée', icon: CheckCircle, class: 'status-validated', colorClass: 'status-validated-color' },
  cancelled: { label: 'Annulée', icon: XCircle, class: 'status-cancelled', colorClass: 'status-cancelled-color' },
  returned: { label: 'Retournée', icon: RotateCcw, class: 'status-returned', colorClass: 'status-returned-color' },
} as const

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Site Web' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'boutique', label: 'Boutique' },
] as const

const TUNISIAN_GOVERNORATES = [
  'Ariana',
  'Béja',
  'Ben Arous',
  'Bizerte',
  'Gabès',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kébili',
  'Le Kef',
  'Mahdia',
  'La Manouba',
  'Médenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan',
]

type EditableOrderForm = {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  customerGouvernorat: string
  source: string
  note: string
}

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  website: {
    label: 'Site Web',
    className: 'source-website',
  },
  instagram: {
    label: 'Instagram',
    className: 'source-instagram',
  },
  facebook: {
    label: 'Facebook',
    className: 'source-facebook',
  },
  whatsapp: {
    label: 'WhatsApp',
    className: 'source-whatsapp',
  },
  boutique: {
    label: 'Boutique',
    className: 'source-boutique',
  },
}

// ============================================
// COMPONENT
// ============================================

export default function OrderEditClient({
  id,
  order,
  canSeeVisitSession: canSeeVisitSessionProp = false,
}: OrderEditProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [localOrder, setLocalOrder] = useState<any>(order)
  const [form, setForm] = useState<EditableOrderForm>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerGouvernorat: '',
    source: 'website',
    note: '',
  })
  const [populatedProducts, setPopulatedProducts] = useState<Record<string, PopulatedProduct>>({})
  const [authorName, setAuthorName] = useState<string | null>(null)
  /** Payload document id for the Visits row matching order.visitId */
  const [visitDocId, setVisitDocId] = useState<string | null>(null)
  const [visitLookupDone, setVisitLookupDone] = useState(false)
  /** Fallback if server prop did not pass role */
  const [canSeeVisitSessionClient, setCanSeeVisitSessionClient] = useState(
    canSeeVisitSessionProp,
  )
  const canSeeVisitSession =
    canSeeVisitSessionProp || canSeeVisitSessionClient

  useEffect(() => {
    if (canSeeVisitSessionProp) {
      setCanSeeVisitSessionClient(true)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/users/me', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const role = String(data?.user?.role || data?.role || '')
        if (!cancelled && (role === 'owner' || role === 'admin')) {
          setCanSeeVisitSessionClient(true)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canSeeVisitSessionProp])

  // Keep local order in sync when server refreshes the prop
  useEffect(() => {
    setLocalOrder(order)
  }, [order])

  const startEditing = () => {
    const current = localOrder || order
    setForm({
      customerName: String(current?.customerName || ''),
      customerPhone: String(current?.customerPhone || ''),
      customerEmail: String(current?.customerEmail || ''),
      customerAddress: String(current?.customerAddress || ''),
      customerGouvernorat: String(current?.customerGouvernorat || ''),
      source: String(current?.source || 'website'),
      note: String(current?.note || ''),
    })
    setSaveError(null)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setSaveError(null)
  }

  const handleSaveOrder = async () => {
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setSaveError('Nom et téléphone sont obligatoires')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const payload = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || null,
        customerAddress: form.customerAddress.trim() || null,
        customerGouvernorat: form.customerGouvernorat.trim() || null,
        source: form.source || 'website',
        note: form.note.trim() || null,
      }

      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const msg =
          data?.errors?.[0]?.message ||
          data?.message ||
          'Erreur lors de la mise à jour'
        setSaveError(msg)
        return
      }

      const data = await res.json().catch(() => null)
      const updated = data?.doc || data
      if (updated && typeof updated === 'object') {
        setLocalOrder((prev: any) => ({ ...prev, ...updated, ...payload }))
      } else {
        setLocalOrder((prev: any) => ({ ...prev, ...payload }))
      }

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      setSaveError('Erreur réseau lors de la mise à jour')
    } finally {
      setIsSaving(false)
    }
  }

  const normalizeStatus = (status?: string | null) => {
    const allowedStatuses = new Set(['new', 'validated', 'cancelled', 'returned'])
    const normalizedStatus = status || 'new'
    return allowedStatuses.has(normalizedStatus) ? normalizedStatus : 'new'
  }

  // Fetch products
  useEffect(() => {
    if (!order) return

    const productIds: string[] = []
    if (Array.isArray(order?.product)) {
      for (const p of order.product) {
        const pid = typeof p === 'object' ? p?.id : p
        if (pid && !populatedProducts[pid]) productIds.push(pid)
      }
    }

    if (productIds.length === 0) return

    const fetchProducts = async () => {
      const results: Record<string, PopulatedProduct> = {}
      await Promise.all(
        productIds.map(async (pid) => {
          try {
            const res = await fetch(`/api/products/${pid}?depth=0`, { credentials: 'include' })
            if (res.ok) {
              const data = await res.json()
              results[pid] = { id: pid, productTitle: data.productTitle, currentPrice: data.currentPrice }
            }
          } catch {
            // ignore
          }
        })
      )
      setPopulatedProducts((prev) => ({ ...prev, ...results }))
    }

    fetchProducts()
  }, [order?.product])

  // Resolve Visits document id from session visitId → open the edit page, not the list
  // Only for owner / admin (sales must not see visit sessions)
  useEffect(() => {
    if (!canSeeVisitSession) {
      setVisitDocId(null)
      setVisitLookupDone(true)
      return
    }

    const sessionId = order?.visitId ? String(order.visitId).trim() : ''
    if (!sessionId) {
      setVisitDocId(null)
      setVisitLookupDone(true)
      return
    }

    let cancelled = false
    setVisitLookupDone(false)

    const run = async () => {
      try {
        const qs = new URLSearchParams()
        qs.set('where[visitId][equals]', sessionId)
        qs.set('limit', '1')
        qs.set('depth', '0')
        const res = await fetch(`/api/visits?${qs.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (!cancelled) {
            setVisitDocId(null)
            setVisitLookupDone(true)
          }
          return
        }
        const data = await res.json()
        const doc = Array.isArray(data?.docs) ? data.docs[0] : null
        if (!cancelled) {
          setVisitDocId(doc?.id ? String(doc.id) : null)
          setVisitLookupDone(true)
        }
      } catch {
        if (!cancelled) {
          setVisitDocId(null)
          setVisitLookupDone(true)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [order?.visitId, canSeeVisitSession])

  // Fetch author
  useEffect(() => {
    if (!order) return

    const authorId = typeof order?.author === 'object' ? order?.author?.id : order?.author
    if (!authorId) return

    const fetchAuthor = async () => {
      try {
        const res = await fetch(`/api/users/${authorId}?depth=0`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setAuthorName(data.name || data.email || data.id || String(authorId))
        }
      } catch {
        // ignore
      }
    }

    fetchAuthor()
  }, [order?.author])

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.replace('/admin/collections/orders')
        router.refresh()
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    setIsUpdatingStatus(true)

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        setLocalOrder((prev: any) => ({ ...prev, status }))
        router.refresh()
      } else {
        alert('Erreur lors du changement de statut')
      }
    } catch (err) {
      console.error(err)
      alert('Erreur lors du changement de statut')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Format birth date for display
  const formatBirthDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  // Calculate days until next birthday
  const getDaysUntilBirthday = (dateString: string | null | undefined) => {
    if (!dateString) return null
    
    try {
      const today = new Date()
      const birthDate = new Date(dateString)
      const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
      
      if (nextBirthday < today) {
        nextBirthday.setFullYear(today.getFullYear() + 1)
      }
      
      const diffTime = nextBirthday.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays
    } catch {
      return null
    }
  }

  if (!order && !localOrder) {
    return (
      <div className="order-edit-loading">
        <div className="order-edit-spinner"></div>
        <p>Commande introuvable</p>
      </div>
    )
  }

  const o = localOrder || order

  const rawProducts = o.product || []
  const products: any[] = Array.isArray(rawProducts) ? rawProducts : []

  const items: OrderItem[] = Array.isArray(o.items) && o.items.length > 0
    ? o.items
    : products.map((p: any) => {
        const pid = typeof p === 'object' ? p?.id : p
        const fetched = pid ? populatedProducts[pid] : null
        return {
          productId: pid,
          title: fetched?.productTitle || (typeof p === 'object' ? p?.productTitle || p?.title : null) || 'Produit',
          price: fetched?.currentPrice || (typeof p === 'object' ? p?.currentPrice || p?.price : 0) || 0,
          quantity: 1,
          subtotal: fetched?.currentPrice || 0,
        }
      })

  const displayAuthor = authorName
    || (typeof o.author === 'object' ? o.author?.name || o.author?.email || o.author?.id : o.author)
    || null

  const currentStatus = ORDER_STATUS[normalizeStatus(o.status) as keyof typeof ORDER_STATUS]
  const StatusIcon = currentStatus?.icon || Package

  const birthDateFormatted = formatBirthDate(order.customerBirthDate)
  const daysUntilBirthday = getDaysUntilBirthday(order.customerBirthDate)

  return (
    <div className="order-edit-container">
      {/* Header */}
      <div className="order-edit-header">
        <div className="order-edit-header-left">
          <button className="order-edit-back-btn" onClick={() => router.push('/admin/collections/orders')}>
            <ArrowLeft size={16} />
            Retour
          </button>
          <h1 className="order-edit-title">Commande {o.orderNumber || 'N/A'}</h1>
          {currentStatus && (
            <span className={`order-edit-status-badge ${currentStatus.class}`}>
              <StatusIcon size={16} />
              {currentStatus.label}
            </span>
          )}
        </div>
        <div className="order-edit-header-right">
          {!isEditing ? (
            <button
              type="button"
              className="order-edit-btn-edit"
              onClick={startEditing}
            >
              <Pencil size={16} />
              Modifier
            </button>
          ) : (
            <>
              <button
                type="button"
                className="order-edit-btn-cancel"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="order-edit-btn-save"
                onClick={handleSaveOrder}
                disabled={isSaving}
              >
                <Save size={16} />
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </>
          )}
          <ExportOrderButton
            order={o}
            items={items}
            displayAuthor={displayAuthor}
          />

          <button
            className="order-edit-btn-delete"
            disabled={isDeleting || isEditing}
            onClick={handleDelete}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="order-edit-save-error" role="alert">
          {saveError}
        </div>
      )}

      {/* Status Actions */}
      <div className="order-edit-status-actions">
        <span className="order-edit-status-label">Changer le statut :</span>
        {(Object.keys(ORDER_STATUS) as Array<keyof typeof ORDER_STATUS>).map((status) => {
          const { icon: Icon, label, colorClass } = ORDER_STATUS[status]
          const isActive = status === o.status
          return (
            <button
              key={status}
              className={`order-edit-status-btn ${colorClass} ${isActive ? 'active' : ''}`}
              onClick={() => handleStatusChange(status)}
              disabled={isUpdatingStatus || isEditing}
            >
              <Icon size={14} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="order-edit-grid">
        {/* Left - Customer Info */}
        <div className="order-edit-card">
          <div className="order-edit-card-header">
            <User className="order-edit-card-icon" size={22} />
            <h2>Informations client</h2>
          </div>
          <div className="order-edit-card-body">
            <div className="order-edit-field">
              <label>Nom complet</label>
              {isEditing ? (
                <input
                  className="order-edit-input"
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerName: e.target.value }))
                  }
                  required
                />
              ) : (
                <p>{o.customerName || '-'}</p>
              )}
            </div>
            <div className="order-edit-field">
              <label>Téléphone</label>
              {isEditing ? (
                <input
                  className="order-edit-input"
                  value={form.customerPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerPhone: e.target.value }))
                  }
                  required
                />
              ) : (
                <p>{o.customerPhone || '-'}</p>
              )}
            </div>
            <div className="order-edit-field">
              <label>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  className="order-edit-input"
                  value={form.customerEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerEmail: e.target.value }))
                  }
                />
              ) : (
                <p>{o.customerEmail || '-'}</p>
              )}
            </div>
            <div className="order-edit-field">
              <label>Adresse</label>
              {isEditing ? (
                <input
                  className="order-edit-input"
                  value={form.customerAddress}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerAddress: e.target.value }))
                  }
                />
              ) : (
                <p>{o.customerAddress || '-'}</p>
              )}
            </div>
            <div className="order-edit-field">
              <label>Gouvernorat</label>
              {isEditing ? (
                <select
                  className="order-edit-input"
                  value={form.customerGouvernorat}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      customerGouvernorat: e.target.value,
                    }))
                  }
                >
                  <option value="">—</option>
                  {TUNISIAN_GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <p>{o.customerGouvernorat || '-'}</p>
              )}
            </div>
            
            {/* Birth Date Field */}

           {/* Birth Date Fields */}
        {/* Children Birth Dates */}
<div className="order-edit-field order-edit-birthday-field">
  <label className="order-edit-birthday-label">
    <Gift size={14} />
    Dates d'anniversaire (enfants)
  </label>

  {o.customerChildrenBirthDates &&
  o.customerChildrenBirthDates.length > 0 ? (
    <div className="order-edit-birthday-list">
      {o.customerChildrenBirthDates.map((item: any, index: number) => {
        const childDate = item?.date || item
        const formatted = formatBirthDate(childDate)
        const days = getDaysUntilBirthday(childDate)

        return (
          <div key={index} className="order-edit-birthday-item">
            <div className="order-edit-child-name">
              Enfant {index + 1}
            </div>

            <div className="order-edit-birthday-content">
              {formatted ? (
                <>
                  <span className="order-edit-birthday-date">
                    {formatted}
                  </span>

                  {days !== null && (
                    <span
                      className={`order-edit-birthday-countdown ${
                        days <= 30
                          ? 'birthday-soon'
                          : 'birthday-normal'
                      }`}
                    >
                      <Gift size={12} />

                      {days === 0
                        ? "Aujourd'hui !"
                        : `dans ${days} jour${days > 1 ? 's' : ''}`}
                    </span>
                  )}
                </>
              ) : (
                <span className="order-edit-birthday-empty">
                  Non renseignée
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  ) : (
    <span className="order-edit-birthday-empty">
      Non renseignées
    </span>
  )}
</div>
            
            <div className="order-edit-field">
              <label>Source</label>
              {isEditing ? (
                <select
                  className="order-edit-input"
                  value={form.source}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, source: e.target.value }))
                  }
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                (() => {
                  const source = SOURCE_LABELS[o.source || '']
                  return (
                    <span
                      className={`order-edit-source-badge ${
                        source?.className || 'source-default'
                      }`}
                    >
                      {source?.label || o.source || '-'}
                    </span>
                  )
                })()
              )}
            </div>
            {canSeeVisitSession && o.visitId && (
              <div className="order-edit-field">
                <label>Visite (session)</label>
                <p>
                  {visitDocId ? (
                    <a
                      href={`/admin/collections/visits/${visitDocId}`}
                      className="order-edit-visit-link"
                      title="Ouvrir la fiche visite"
                    >
                      Voir la visite
                    </a>
                  ) : visitLookupDone ? (
                    <span className="order-edit-visit-missing" title={String(o.visitId)}>
                      Visite introuvable
                    </span>
                  ) : (
                    <span className="order-edit-visit-hint">Recherche…</span>
                  )}
                </p>
                <p className="order-edit-visit-hint" title={String(o.visitId)}>
                  ID session:{' '}
                  {String(o.visitId).length > 18
                    ? `${String(o.visitId).slice(0, 8)}…${String(o.visitId).slice(-6)}`
                    : o.visitId}
                </p>
              </div>
            )}
            {displayAuthor && (
              <div className="order-edit-field">
                <label>Responsable</label>
                <p>{displayAuthor}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right - Order Details */}
        <div className="order-edit-card">
          <div className="order-edit-card-header">
            <Receipt className="order-edit-card-icon" size={22} />
            <h2>Détails de la commande</h2>
          </div>
          <div className="order-edit-card-body">
            <div className="order-edit-field">
              <label>Référence</label>
              <p className="order-edit-reference">{o.orderNumber || 'N/A'}</p>
            </div>
            <div className="order-edit-field">
              <label>Total</label>
              <p className="order-edit-total">{Number(o.totalAmount || 0).toFixed(2)} DT</p>
            </div>
            <div className="order-edit-field">
              <label>Quantité</label>
              <p>{o.quantity || 0}</p>
            </div>
            <div className="order-edit-field">
              <label>Date de création</label>
              <p>
                {o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </p>
            </div>
            <div className="order-edit-field">
              <label>Note</label>
              {isEditing ? (
                <textarea
                  className="order-edit-input order-edit-textarea"
                  rows={3}
                  value={form.note}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                  placeholder="Note interne…"
                />
              ) : (
                <p className="order-edit-note">{o.note || '—'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="order-edit-card full-width">
        <div className="order-edit-card-header">
          <ShoppingBag className="order-edit-card-icon" size={22} />
          <h2>Produits commandés</h2>
          <span className="order-edit-products-count">{items.length} article(s)</span>
        </div>
        <div className="order-edit-card-body">
          {items.length > 0 ? (
            <table className="order-edit-items-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Attributes</th>
                  <th>Prix unitaire</th>
                  <th>Quantité</th>
                  <th>Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const pid = item.productId
                  const fetched = pid ? populatedProducts[pid] : null
                  const displayTitle = item.title || fetched?.productTitle || 'Produit'
                  const price = item.price ?? fetched?.currentPrice ?? 0
                  // Le prix initial est celui figé à la commande, pas celui de
                  // la fiche produit : la promotion a pu changer depuis.
                  const oldPrice = Number(item.oldPrice) || 0
                  const hadDiscount = oldPrice > price
                  const qty = item.quantity ?? 1
                  const subtotal = item.subtotal ?? price * qty

                  return (
                    <tr key={item.id || index}>
                      <td>
                        <div className="order-edit-product-name">
                          <Package className="order-edit-product-icon" size={18} />
                          {pid ? (
                            <button
                              className="order-edit-product-link"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/admin/collections/products/${pid}`)
                              }}
                            >
                              {displayTitle}
                            </button>
                          ) : (
                            <span>{displayTitle}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.attributes ? (
                          <span className="order-edit-item-attrs">
                            {formatItemAttributes(item.attributes)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {price.toFixed(2)} DT
                        {hadDiscount && (
                          <span className="order-edit-item-oldprice">
                            {oldPrice.toFixed(2)} DT
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="order-edit-qty-badge">×{qty}</span>
                      </td>
                      <td className="order-edit-subtotal">{subtotal.toFixed(2)} DT</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {Number((order as any).deliveryFee) > 0 && (
                  <tr>
                    <td colSpan={4} className="order-edit-total-label">Livraison</td>
                    <td className="order-edit-total-value">
                      {Number((order as any).deliveryFee).toFixed(2)} DT
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="order-edit-total-label">Total</td>
                  <td className="order-edit-total-value">
                    {Number(order.totalAmount || 0).toFixed(2)} DT
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="order-edit-empty">Aucun produit dans cette commande</p>
          )}
        </div>
      </div>
    </div>
  )
}