import { getPayload } from 'payload'
import config from '@payload-config'
import OrdersListClient from './index.client'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    source?: string
    sort?: string
    page?: string
  }>
}

export default async function OrdersList({ searchParams }: PageProps) {
  const params = await searchParams

  const payload = await getPayload({ config })

  const search = params.search ?? ''
  const status = params.status ?? ''
  const source = params.source ?? ''
  const sort = params.sort ?? '-createdAt'
  const page = Number(params.page) || 1

  const conditions: any[] = []

  if (search) {
    conditions.push({
      or: [
        { orderNumber: { like: search } },
        { customerName: { like: search } },
        { customerPhone: { like: search } },
        { 'items.title': { like: search } },
      ],
    })
  }

  if (status) {
    conditions.push({ status: { equals: status } })
  }

  if (source) {
    conditions.push({ source: { equals: source } })
  }

  const orders = await payload.find({
    collection: 'orders',
    where: conditions.length > 0 ? { and: conditions } : undefined,
    page,
    limit: 12,
    sort,
  })

  return (
    <OrdersListClient
      initialOrders={{
        docs: orders.docs,
        totalDocs: orders.totalDocs,
        totalPages: orders.totalPages,
        page: orders.page ?? 1,
      }}
    />
  )
}