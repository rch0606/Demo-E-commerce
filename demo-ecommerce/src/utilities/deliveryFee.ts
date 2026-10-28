import { getPayload } from 'payload'
import configPromise from '@payload-config'

/** Valeur de repli si le réglage n'a jamais été enregistré. */
export const DEFAULT_DELIVERY_FEE = 8

export function normalizeDeliveryFee(value: unknown): number {
  const fee = Number(value)
  return Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_FEE
}

/**
 * Frais de livraison en cours, lus côté serveur.
 * Un réglage illisible ne doit jamais bloquer une commande : on retombe sur la
 * valeur par défaut plutôt que de laisser le total à zéro.
 */
export async function getDeliveryFee(): Promise<number> {
  try {
    const payload = await getPayload({ config: configPromise })
    const settings = await payload.findGlobal({ slug: 'shop-settings', depth: 0 })
    return normalizeDeliveryFee((settings as { deliveryFee?: unknown })?.deliveryFee)
  } catch {
    return DEFAULT_DELIVERY_FEE
  }
}
