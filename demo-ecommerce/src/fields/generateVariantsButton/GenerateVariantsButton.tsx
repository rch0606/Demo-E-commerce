'use client'

import React from 'react'
import { Button, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import styles from './GenerateVariantsButton.module.css'

/** Identité d'un variant : sa combinaison de valeurs, ordre indifférent. */
const signature = (combination: unknown): string =>
  Array.isArray(combination)
    ? combination
        .map((value) => String(value && typeof value === 'object' ? (value as any).id : value))
        .sort()
        .join('|')
    : ''

export const GenerateVariantsButton: React.FC = () => {
  const { id } = useDocumentInfo()
  
const productAttributes = useFormFields(([fields]) => {
  const rows = fields.productAttributes?.rows ?? []

  return rows.map((_: any, index: number) => ({
    attribute: fields[`productAttributes.${index}.attribute`]?.value,
    values: fields[`productAttributes.${index}.values`]?.value ?? [],
  }))
})

  const currentPrice = useFormFields(([fields]) => 
    Number(fields.currentPrice?.value ?? 0)
  )
  

  const hasAttributes = Array.isArray(productAttributes) &&
    productAttributes.some(
      (item: any) =>
        item?.attribute &&
        Array.isArray(item?.values) &&
        item.values.length > 0
    )

  const [generatedVariants, setGeneratedVariants] = React.useState<any[]>([])
  const [hasGenerated, setHasGenerated] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadingMessage, setLoadingMessage] = React.useState('')

  const handleGenerate = async () => {
    if (!id) {
      alert('Product ID is missing')
      return
    }

    if (!hasAttributes) {
      alert('Please select attributes and values first')
      return
    }

    try {
      setLoadingMessage('Generating variants...')
      setIsLoading(true)

      const res = await fetch(`/api/generate-variants?id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productAttributes }),
      })

      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)

      const data = await res.json()

      if (!data.variants?.length) {
        throw new Error(data.message || 'No variants were generated')
      }

      /**
       * Le stock déjà saisi sur les variants existants est repris tel quel :
       * régénérer ne doit pas effacer un inventaire. Les combinaisons
       * réellement nouvelles partent à zéro, à l'admin de les remplir.
       */
      const existingRes = await fetch(
        `/api/variants?where[product][equals]=${id}&limit=0&depth=0`,
      )
      const existingDocs = existingRes.ok ? (await existingRes.json())?.docs ?? [] : []

      const stockBySignature = new Map<string, number>()
      const priceBySignature = new Map<string, number>()
      const referenceBySignature = new Map<string, string>()

      for (const doc of existingDocs) {
        const key = signature(doc?.combination)
        // Doublons historiques : on additionne pour ne perdre aucune unité.
        stockBySignature.set(key, (stockBySignature.get(key) ?? 0) + (Number(doc?.stock) || 0))
        if (!priceBySignature.has(key)) priceBySignature.set(key, Number(doc?.price) || currentPrice)
        if (doc?.reference && !referenceBySignature.has(key)) referenceBySignature.set(key, doc.reference)
      }

      const prefilled = data.variants.map((variant: any) => {
        const key = signature(variant.combination)
        return {
          ...variant,
          stock: stockBySignature.get(key) ?? 0,
          price: priceBySignature.get(key) ?? currentPrice,
          // Colonne masquée pour l'instant : la référence existante est
          // renvoyée telle quelle pour ne pas être effacée à l'enregistrement.
          reference: referenceBySignature.get(key) ?? '',
        }
      })

      setGeneratedVariants(prefilled)
      setHasGenerated(true)
    } catch (error) {
      console.error('Failed to generate variants:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate variants')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  const handleSave = async () => {
    try {
      if (!generatedVariants.length || !id) return

      setLoadingMessage('Enregistrement des variants...')
      setIsLoading(true)

      /**
       * Une seule requête : le serveur rapproche par combinaison, met à jour,
       * crée, supprime, puis recalcule le stock total une fois. Plus de
       * suppression préalable, donc plus de produit laissé sans variants si
       * quelque chose échoue en route.
       */
      const res = await fetch(`/api/save-variants?id=${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: generatedVariants.map(({ combinationNames, ...variant }) => variant),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Failed to save variants (${res.status})`)
      }

      const result = await res.json()

      alert(
        `Variants enregistrés : ${result.created} créé(s), ${result.updated} mis à jour, ` +
        `${result.deleted} supprimé(s).\nStock total du produit : ${result.totalStock}.`
      )

      window.location.reload()
    } catch (error) {
      console.error('Failed to save variants:', error)
      alert(error instanceof Error ? error.message : 'Failed to save variants')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  const handleRollback = () => {
    setGeneratedVariants([])
    setHasGenerated(false)
  }

  /**
   * La répartition automatique n'est qu'une proposition : l'admin corrige
   * chaque ligne avant d'enregistrer. Un champ vidé vaut 0, pas NaN.
   */
  const updateVariant = (index: number, field: 'stock' | 'price', raw: string) => {
    const parsed = Number(raw)
    const value = raw === '' || !Number.isFinite(parsed) ? 0 : Math.max(0, parsed)

    setGeneratedVariants((previous) =>
      previous.map((variant, i) =>
        i === index
          ? { ...variant, [field]: field === 'stock' ? Math.floor(value) : value }
          : variant,
      ),
    )
  }

  const generatedStockTotal = generatedVariants.reduce(
    (sum, variant) => sum + (Number(variant.stock) || 0),
    0,
  )

  return (
    <div className={styles.container}>
      <Button
        buttonStyle="secondary"
        onClick={handleGenerate}
        disabled={!hasAttributes || isLoading}
      >
        Generate Variants
      </Button>

      {generatedVariants.length > 0 && (
        <>
          <div className={styles.generatedVariantsSection}>
            <h4>Generated Variants:</h4>
            <table className={styles.variantsTable}>
              <thead>
                <tr>
                  <th>Combination</th>
                  <th>Price</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {generatedVariants.map((variant, index) => (
                  <tr key={index} className={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    <td>
                      {variant.combinationNames?.join(' + ') ||
                       variant.combination?.join(' + ') ||
                       'N/A'}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        className={styles.cellInput}
                        value={variant.price ?? 0}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        aria-label={`Prix — ${variant.combinationNames?.join(' + ') || index + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className={styles.cellInput}
                        value={variant.stock ?? 0}
                        onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                        aria-label={`Stock — ${variant.combinationNames?.join(' + ') || index + 1}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className={styles.totalLabel}>
                    Total ({generatedVariants.length} variants)
                  </td>
                  <td />
                  <td className={styles.totalValue}>{generatedStockTotal}</td>
                </tr>
              </tfoot>
            </table>
            <p className={styles.hint}>
              Ajustez le prix et le stock de chaque variant avant d’enregistrer. Le
              stock total du produit sera recalculé à partir de ces valeurs.
            </p>
          </div>

          {hasGenerated && (
            <div className={styles.actions}>
              <Button buttonStyle="primary" onClick={handleSave} aria-label="Save Variants">
                Save
              </Button>
              <Button
                buttonStyle="secondary"
                onClick={handleRollback}
                aria-label="Rollback Variants"
              >
                Rollback
              </Button>
            </div>
          )}
        </>
      )}

      {isLoading && (
        <div className={styles.loadingOverlay} role="alert" aria-busy="true" aria-live="assertive">
          <div className={styles.loadingModal}>{loadingMessage || 'Loading...'}</div>
        </div>
      )}
    </div>
  )
}