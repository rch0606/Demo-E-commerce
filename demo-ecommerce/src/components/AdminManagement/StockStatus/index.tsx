'use client'

import { useField } from '@payloadcms/ui'

const STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    color: 'var(--dt-success-text)',
    bgColor: 'var(--dt-success-bg)',
    borderColor: 'color-mix(in srgb, var(--dt-success) 35%, transparent)',
  },
  out: {
    label: 'Rupture de stock',
    color: 'var(--dt-danger-text)',
    bgColor: 'var(--dt-danger-bg)',
    borderColor: 'color-mix(in srgb, var(--dt-danger) 35%, transparent)',
  },
}

function getStockStatus(totalStock: number): 'available' | 'out' {
  // <= 0 : un stock négatif est une rupture, pas une disponibilité.
  if (totalStock <= 0) return 'out'
  return 'available'
}

export function StockStatusField() {
  const { value: totalStock } = useField({ path: 'totalStock' })

  const stockValue = typeof totalStock === 'number' ? totalStock : 0
  const status = getStockStatus(stockValue)
  const config = STATUS_CONFIG[status]

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: 'var(--dt-radius-sm)',
        border: `2px solid ${config.borderColor}`,
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 600,
        fontSize: '14px',
        marginBottom: '16px',
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block',
        }}
      />
      {config.label}
    </div>
  )
}

export default function StockStatus() {
  return <StockStatusField />
}
