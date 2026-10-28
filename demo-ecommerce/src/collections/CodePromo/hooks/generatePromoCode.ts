import { getPayload } from 'payload'
import config from '@payload-config'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(length = 8) {
  let promoCode = ''

  for (let i = 0; i < length; i++) {
    promoCode += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }

  return promoCode
}

export async function generateUniquePromoCode(length = 8) {
  const payload = await getPayload({ config })

  while (true) {
    const promoCode = randomCode(length)

    const existing = await payload.find({
      collection: 'promo-codes',
      where: {
        promoCode: {
          equals: promoCode,
        },
      },
      limit: 1,
    })

    if (existing.totalDocs === 0) {
      return promoCode
    }
  }
}