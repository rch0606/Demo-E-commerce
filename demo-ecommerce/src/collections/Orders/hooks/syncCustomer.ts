import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

async function updateCustomer(payload: any, phone: string) {
  if (!phone) return

  // Get every order of this customer
  const orders = await payload.find({
    collection: 'orders',
    where: {
      customerPhone: {
        equals: phone,
      },
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  if (!orders.docs.length) {
    return
  }

  const latestOrder = [...orders.docs].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  )[0]

  const totalOrders = orders.docs.length

  const totalSpent = orders.docs.reduce(
    (sum: number, order: any) =>
      sum + Number(order.totalAmount || 0),
    0,
  )

  // Look for existing customer
  const existing = await payload.find({
    collection: 'customers',
    where: {
      phone: {
        equals: phone,
      },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const customerData = {
    name: latestOrder.customerName,
    phone: latestOrder.customerPhone,
    email: latestOrder.customerEmail || undefined,
    address: latestOrder.customerAddress,
    governorate: latestOrder.customerGouvernorat,

    childrenBirthDates:
      latestOrder.customerChildrenBirthDates || [],

    totalOrders,
    totalSpent,

    lastOrderDate: latestOrder.createdAt,
    lastOrderNumber: latestOrder.orderNumber,
  }

  if (existing.docs.length) {
    await payload.update({
      collection: 'customers',
      id: existing.docs[0].id,
      data: customerData,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'customers',
      data: customerData,
      overrideAccess: true,
    })
  }
}

export const syncCustomerOnOrderChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  await updateCustomer(req.payload, doc.customerPhone)

  return doc
}

export const syncCustomerOnOrderDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const payload = req.payload

  const remainingOrders = await payload.find({
    collection: 'orders',
    where: {
      customerPhone: {
        equals: doc.customerPhone,
      },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (remainingOrders.docs.length === 0) {
    const existing = await payload.find({
      collection: 'customers',
      where: {
        phone: {
          equals: doc.customerPhone,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (existing.docs.length) {
      await payload.delete({
        collection: 'customers',
        id: existing.docs[0].id,
        overrideAccess: true,
      })
    }

    return doc
  }

  await updateCustomer(payload, doc.customerPhone)

  return doc
}