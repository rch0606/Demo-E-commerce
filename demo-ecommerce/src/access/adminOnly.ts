import type { Access } from 'payload'

export const adminOnly: Access = ({ req: { user } }) => {
  return user?.role === 'admin'
}