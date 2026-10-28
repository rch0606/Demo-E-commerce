'use client'

import { useEffect, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { History, ArrowUpToLine, ArrowDownToLine, Clock } from 'lucide-react'
import './index.css'

type Movement = {
  id: string
  movementType: string
  quantity: number
  beforeStock: number
  afterStock: number
  createdAt: string
  order?: {
    orderNumber?: string
  } | null
  variant?: {
    sku?: string
    title?: string
    combination?: Array<{
      label?: string
      value?: string
      attribute?: { name?: string; label?: string } | string | null
    }>
  } | null
  productAttributes?: Array<{
    label?: string
    value?: string
    attribute?: { name?: string; label?: string } | string | null
  }> | null
}

// Helper function for formatting numbers
function formatNumber(num: number): string {
  return num.toLocaleString('fr-FR')
}

export default function StockMovementHistory() {
  const { id } = useDocumentInfo()

  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  
  // Calculate metrics from the movements data
  const inventoryMovementsToday = movements.filter(m => {
    const today = new Date()
    const movementDate = new Date(m.createdAt)
    return movementDate.toDateString() === today.toDateString()
  }).length

  const inventoryEntriesToday = movements.filter(m => {
    const today = new Date()
    const movementDate = new Date(m.createdAt)
    return movementDate.toDateString() === today.toDateString() && 
           (m.movementType === 'stock_entry' || m.movementType === 'order_restore' || m.movementType === 'customer_return')
  }).length

  const inventoryExitsToday = movements.filter(m => {
    const today = new Date()
    const movementDate = new Date(m.createdAt)
    return movementDate.toDateString() === today.toDateString() && 
           (m.movementType === 'order_deduct' || m.movementType === 'stock_exit')
  }).length

  const inventoryMovementsWeek = movements.filter(m => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const movementDate = new Date(m.createdAt)
    return movementDate >= weekAgo
  }).length

  useEffect(() => {
    if (!id) return

    async function fetchMovements() {
      try {
        const res = await fetch(
          `/api/inventory-movements?where[product][equals]=${id}&depth=3&sort=-createdAt`
        )

        const data = await res.json()

        setMovements(data.docs || [])
      } catch (error) {
        console.error('Error loading stock movements:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMovements()
  }, [id])


  if (loading) {
    return null
  }


  return (
    <>
      {/* Stock Movements Section */}
      {/* <section className="ph-section">
        <div className="ph-section__header">
          <History size={20} />
          <h2 className="ph-section__title">Mouvements de stock</h2>
          <p className="ph-section__subtitle">Activité de l'inventaire</p>
        </div>
        <div className="ph-grid ph-grid--4">
          <div className="ph-metric-card">
            <div className="ph-metric-card__icon">
              <History size={24} />
            </div>
            <div className="ph-metric-card__content">
              <p className="ph-metric-card__label">Mouvements aujourd'hui</p>
              <p className="ph-metric-card__value">{formatNumber(inventoryMovementsToday)}</p>
              <p className="ph-metric-card__note">Toutes les opérations de stock</p>
            </div>
          </div>
          
          <div className="ph-metric-card ph-tone-success">
            <div className="ph-metric-card__icon">
              <ArrowUpToLine size={24} />
            </div>
            <div className="ph-metric-card__content">
              <p className="ph-metric-card__label">Entrées aujourd'hui</p>
              <p className="ph-metric-card__value">{formatNumber(inventoryEntriesToday)}</p>
              <p className="ph-metric-card__note">Stock ajouté ou restauré</p>
            </div>
          </div>
          
          <div className="ph-metric-card ph-tone-danger">
            <div className="ph-metric-card__icon">
              <ArrowDownToLine size={24} />
            </div>
            <div className="ph-metric-card__content">
              <p className="ph-metric-card__label">Sorties aujourd'hui</p>
              <p className="ph-metric-card__value">{formatNumber(inventoryExitsToday)}</p>
              <p className="ph-metric-card__note">Stock vendu ou sorti</p>
            </div>
          </div>
          
          <div className="ph-metric-card">
            <div className="ph-metric-card__icon">
              <Clock size={24} />
            </div>
            <div className="ph-metric-card__content">
              <p className="ph-metric-card__label">Mouvements semaine</p>
              <p className="ph-metric-card__value">{formatNumber(inventoryMovementsWeek)}</p>
              <p className="ph-metric-card__note">Activité sur les 7 derniers jours</p>
            </div>
          </div>
        </div>
      </section> */}

      {/* Existing Stock Movement List */}
      {!movements.length ? (
        <div
          style={{
            padding: '20px',
            border: '1px dashed #ddd',
            borderRadius: '12px',
          }}
        >
          Aucun mouvement de stock
        </div>
      ) : (
        <div className="stock-history">
          <h3 className="stock-history__title">
            Historique des mouvements de stock
          </h3>

          <div className="stock-history__table-wrapper">
            <table className="stock-history__table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Variante</th>
                  <th>Quantité</th>
                  <th>Avant</th>
                  <th>Après</th>
                  <th>Commande</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement)=>(
                  <tr key={movement.id}>
                    <td>
                      <span
                        className={`stock-history__badge ${
                          movement.movementType === 'order_deduct'
                          ? 'stock-history__badge--out'
                          : movement.movementType === 'order_restore'
                          ? 'stock-history__badge--in'
                          : 'stock-history__badge--neutral'
                        }`}
                      >
                        {formatMovementType(movement.movementType)}
                      </span>
                    </td>

                    <td className="stock-history__variant">
                      {formatVariantLabel(movement)}
                    </td>

                    <td className="stock-history__number">
                      {movement.quantity}
                    </td>

                    <td>
                      {movement.beforeStock}
                    </td>

                    <td className="stock-history__after">
                      {movement.afterStock}
                    </td>

                    <td>
                      {movement.order?.orderNumber || '-'}
                    </td>

                    <td>
                      {new Date(
                        movement.createdAt
                      ).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}


function formatMovementType(type: string) {
  const labels: Record<string,string> = {
    stock_entry: 'Entrée stock',
    stock_exit: 'Sortie stock',
    order_deduct: 'Sortie commande',
    order_restore: 'Retour commande',
    manual_adjustment: 'Ajustement',
    customer_return: 'Retour client',
  }

  return labels[type] || type
}

function formatVariantLabel(movement: Movement): string {
  const variant = movement.variant

  if (variant && typeof variant === 'object') {
    if (Array.isArray(variant.combination) && variant.combination.length > 0) {
      const parts = variant.combination
        .filter(Boolean)
        .map((combo) => {
          const attr =
            typeof combo.attribute === 'object' && combo.attribute
              ? combo.attribute.name || combo.attribute.label || ''
              : ''
          const value = combo.label || combo.value || ''
          return attr ? `${attr}: ${value}` : value
        })
        .filter(Boolean)

      if (parts.length > 0) return parts.join(' · ')
    }

    if (variant.sku) return variant.sku
    if (variant.title) return variant.title
  }

  if (Array.isArray(movement.productAttributes) && movement.productAttributes.length > 0) {
    const parts = movement.productAttributes
      .filter(Boolean)
      .map((attr) => {
        const attrName =
          typeof attr.attribute === 'object' && attr.attribute
            ? attr.attribute.name || attr.attribute.label || ''
            : ''
        const value = attr.label || attr.value || ''
        return attrName ? `${attrName}: ${value}` : value
      })
      .filter(Boolean)

    if (parts.length > 0) return parts.join(' · ')
  }

  return '-'
}