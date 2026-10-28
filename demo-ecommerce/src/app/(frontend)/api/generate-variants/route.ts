import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json(
        { message: 'Missing product id' },
        { status: 400 },
      )
    }

    const { productAttributes } = await req.json()

    if (!Array.isArray(productAttributes) || productAttributes.length === 0) {
      return NextResponse.json(
        { message: 'No attributes provided' },
        { status: 400 },
      )
    }

    const product = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 2,
    })

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 },
      )
    }

    // Build groups from the selected values
    const valueGroups = await Promise.all(
      productAttributes.map(async (item: any) => {
        if (!item.attribute || !Array.isArray(item.values) || item.values.length === 0) {
          return []
        }

        const values = await Promise.all(
          item.values.map(async (valueId: string) => {
            const value = await payload.findByID({
              collection: 'attributeValues',
              id: valueId,
            })

            return {
              attribute: item.attribute,
              value: value.id,
              valueName: value.value,
            }
          }),
        )

        return values
      }),
    )

    if (valueGroups.some(group => group.length === 0)) {
      return NextResponse.json(
        {
          message: 'One or more attributes have no selected values.',
        },
        { status: 400 },
      )
    }

    const cartesian = (groups: any[][]): any[][] =>
      groups.reduce(
        (acc, group) =>
          acc.flatMap(a => group.map(g => [...a, g])),
        [[]] as any[][],
      )

    const combinations = cartesian(valueGroups)

    const variants = combinations.map(combo => ({
      product: productId,
      attributes: combo.map(c => c.attribute),
      combination: combo.map(c => c.value),
      combinationNames: combo.map(c => c.valueName),
      price: 0,
      stock: 0,
    }))

    return NextResponse.json({
      variants,
    })
  } catch (err) {
    console.error(err)

    return NextResponse.json(
      {
        message: 'Failed to generate variants',
      },
      {
        status: 500,
      },
    )
  }
}