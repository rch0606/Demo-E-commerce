'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type CartItem = {
  id: string
  productId: string
  variantId?: string | null
  slug: string
  title: string
  image?: string
  quantity: number
  price: number
  oldPrice?: number
  stock: number
  selectedAttributes: {
    attribute: string
    value: string
  }[]
}

const EXPRESS_KEY = 'express-checkout'

function readExpressFromSession(): CartItem | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(EXPRESS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CartItem
  } catch {
    return null
  }
}

function writeExpressToSession(item: CartItem | null) {
  if (typeof window === 'undefined') return
  try {
    if (item) sessionStorage.setItem(EXPRESS_KEY, JSON.stringify(item))
    else sessionStorage.removeItem(EXPRESS_KEY)
  } catch {
    /* ignore */
  }
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean

  expressItem: CartItem | null
  addItem: (item: Omit<CartItem, 'id'>, openDrawer?: boolean) => void
  startExpressCheckout: (item: Omit<CartItem, 'id'>) => void
  clearExpressCheckout: () => void
  hydrateExpressCheckout: () => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  updateItem: (
    id: string,
    updates: Partial<
      Pick<
        CartItem,
        | 'variantId'
        | 'quantity'
        | 'price'
        | 'oldPrice'
        | 'selectedAttributes'
        | 'title'
        | 'image'
        | 'stock'
      >
    >,
  ) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalItemsCount: () => number
  getTotalPrice: () => number
  getItemCount: (productId: string, variantId?: string) => number
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

function syncCartToCookie(items: CartItem[]) {
  if (typeof document === 'undefined') return

  try {
    const cookieValue = encodeURIComponent(
      JSON.stringify({
        state: {
          items,
        },
      }),
    )
    document.cookie = `cart-storage=${cookieValue}; path=/; max-age=31536000; SameSite=Lax`
  } catch (error) {
    console.error('Error syncing cart to cookie:', error)
  }
}

function makeItemId(productId: string) {
  return `${productId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Plafond de quantité d'une ligne de panier.
 *
 * `stock || 99` transformait un stock de 0 en autorisation de 99 unités : zéro
 * est une valeur légitime, pas une absence. Seul un stock réellement inconnu
 * retombe sur la limite de repli.
 */
const FALLBACK_STOCK = 99

function normalizeStock(value: unknown): number {
  const stock = Number(value)
  if (value == null || !Number.isFinite(stock)) return FALLBACK_STOCK
  return Math.max(0, stock)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      expressItem: null,

      addItem: (item, openDrawer = true) => {
        const { items } = get()

        const existingItemIndex = items.findIndex(
          (i) =>
            i.productId === item.productId &&
            i.variantId === item.variantId &&
            JSON.stringify(i.selectedAttributes) ===
              JSON.stringify(item.selectedAttributes),
        )

        let newItems: CartItem[]

        if (existingItemIndex > -1) {
          const updatedItems = [...items]
          const existingItem = updatedItems[existingItemIndex]
          const newQuantity = Math.min(
            existingItem.quantity + item.quantity,
            normalizeStock(item.stock),
          )

          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
          }
          newItems = updatedItems
        } else {
          const newItem: CartItem = {
            ...item,
            id: makeItemId(item.productId),
            stock: normalizeStock(item.stock),
          }
          newItems = [...items, newItem]
        }

        syncCartToCookie(newItems)
        set({ items: newItems, isOpen: openDrawer })
      },

      startExpressCheckout: (item) => {
        const newItem: CartItem = {
          ...item,
          id: makeItemId(item.productId),
          stock: normalizeStock(item.stock),
        }
        // Real cart (items) is NOT touched
        writeExpressToSession(newItem)
        set({ expressItem: newItem, isOpen: false })
      },

      clearExpressCheckout: () => {
        writeExpressToSession(null)
        set({ expressItem: null })
      },

      hydrateExpressCheckout: () => {
        const fromSession = readExpressFromSession()
        if (fromSession) {
          set({ expressItem: fromSession })
        }
      },

      removeItem: (id) => {
        // Express checkout item
        const express = get().expressItem
        if (express && express.id === id) {
          writeExpressToSession(null)
          set({ expressItem: null })
          return
        }

        const newItems = get().items.filter((item) => item.id !== id)
        syncCartToCookie(newItems)
        set({ items: newItems })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }

        // Express checkout item
        const express = get().expressItem
        if (express && express.id === id) {
          if (quantity > normalizeStock(express.stock)) return
          const next = { ...express, quantity }
          writeExpressToSession(next)
          set({ expressItem: next })
          return
        }

        const item = get().items.find((i) => i.id === id)
        if (item && quantity > item.stock) {
          return
        }

        const newItems = get().items.map((item) =>
          item.id === id ? { ...item, quantity } : item,
        )

        syncCartToCookie(newItems)
        set({ items: newItems })
      },

      updateItem: (id, updates) => {
        const express = get().expressItem
        if (express && express.id === id) {
          const next = { ...express, ...updates, id: express.id, productId: express.productId }
          writeExpressToSession(next)
          set({ expressItem: next })
          return
        }

        const newItems = get().items.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            ...updates,
            id: item.id,
            productId: item.productId,
          }
        })
        syncCartToCookie(newItems)
        set({ items: newItems })
      },

      clearCart: () => {
        syncCartToCookie([])
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalItemsCount: () => {
        return get().items.length
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        )
      },

      getItemCount: (productId, variantId) => {
        const { items } = get()
        const item = items.find(
          (i) => i.productId === productId && i.variantId === variantId,
        )
        return item?.quantity || 0
      },

      openCart: () => {
        set({ isOpen: true })
        if (typeof document !== 'undefined') {
          document.body.style.overflow = 'hidden'
        }
      },

      closeCart: () => {
        set({ isOpen: false })
        if (typeof document !== 'undefined') {
          document.body.style.overflow = 'unset'
        }
      },

      toggleCart: () => {
        const { isOpen } = get()
        if (isOpen) {
          set({ isOpen: false })
          if (typeof document !== 'undefined') {
            document.body.style.overflow = 'unset'
          }
        } else {
          set({ isOpen: true })
          if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden'
          }
        }
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        isOpen: false,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Error rehydrating cart:', error)
            return
          }
          if (state?.items && state.items.length > 0) {
            syncCartToCookie(state.items)
          }
          try {
            const raw = sessionStorage.getItem('express-checkout')
            if (raw) {
              const item = JSON.parse(raw)
              useCartStore.setState({ expressItem: item })
            }
          } catch {
          }
        }
      },
    },
  ),
)
