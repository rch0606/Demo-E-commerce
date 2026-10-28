'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type WishlistItem = {
  productId: string
  slug: string
  title: string
  image?: string
  currentPrice: number
  oldPrice?: number
}

interface WishlistStore {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  toggleItem: (item: WishlistItem) => void
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
  getTotalItems: () => number
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get()
        const exists = items.find((i) => i.productId === item.productId)
        if (!exists) {
          set({ items: [...items, item] })
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) })
      },

      toggleItem: (item) => {
        const { items, addItem, removeItem } = get()
        const exists = items.find((i) => i.productId === item.productId)
        if (exists) {
          removeItem(item.productId)
        } else {
          addItem(item)
        }
      },

      isInWishlist: (productId) => {
        return get().items.some((i) => i.productId === productId)
      },

      clearWishlist: () => {
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.length
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
