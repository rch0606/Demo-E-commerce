import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Coordonnées des clients : réservées à l'équipe connectée.
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const ordersResponse = await payload.find({
      collection: 'orders',
      limit: 10000,
      depth: 0,
      sort: '-createdAt',
    })
    
    const orders = ordersResponse.docs
    
    const clientsMap = new Map<string, any>()
    
    orders.forEach((order: any) => {
      const phone = order.customerPhone || 'unknown'
      
      if (!clientsMap.has(phone)) {
        clientsMap.set(phone, {
          id: phone,
          customerName: order.customerName || 'Inconnu',
          customerPhone: phone,
          customerEmail: order.customerEmail || null,
          customerGouvernorat: order.customerGouvernorat || null,
          customerAddress: order.customerAddress || null,
          customerBirthDate: null,
          customerChildrenBirthDates: [],
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          orderNumbers: [] as string[],
        })
      }
      
      const client = clientsMap.get(phone)
      client.totalOrders++
      client.totalSpent += order.totalAmount || 0
      client.orderNumbers.push(order.orderNumber || '')
      

      if (order.customerName && order.customerName !== 'Inconnu') {
        client.customerName = order.customerName
      }
      if (order.customerEmail) {
        client.customerEmail = order.customerEmail
      }
      if (order.customerAddress) {
        client.customerAddress = order.customerAddress
      }
      if (order.customerGouvernorat) {
        client.customerGouvernorat = order.customerGouvernorat
      }
      

      if (order.customerChildrenBirthDates && Array.isArray(order.customerChildrenBirthDates)) {

        if (order.customerChildrenBirthDates.length > 0) {
          client.customerBirthDate = order.customerChildrenBirthDates[0]?.date || null
        }
        

        client.customerChildrenBirthDates = order.customerChildrenBirthDates.map((item: any) => ({
          date: item.date || item,
          label: item.label || 'Date de naissance',
        }))
      }
      

      if (!client.lastOrderDate || (order.createdAt && new Date(order.createdAt) > new Date(client.lastOrderDate))) {
        client.lastOrderDate = order.createdAt
      }
    })
    
    const clients = Array.from(clientsMap.values())
    
    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}