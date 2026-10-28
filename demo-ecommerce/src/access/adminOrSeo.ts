import type { Access } from 'payload'

export const adminOrSeo: Access = ({ req: { user } }) => {
  return user?.role === 'admin' || user?.role === 'seo'
}