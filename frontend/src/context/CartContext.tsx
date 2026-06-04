'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url: string
  category: string
  unit?: string
}

interface CartContextValue {
  items: CartItem[]
  totalCount: number
  totalPrice: number
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue>({
  items: [],
  totalCount: 0,
  totalPrice: 0,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
})

export function useCart() {
  return useContext(CartContext)
}

const storageKey = (uid: string) => `market_ai_cart_${uid}`

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [uid, setUid] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Auth state değişince doğru kullanıcının sepetini yükle
  useEffect(() => {
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
        try {
          const saved = localStorage.getItem(storageKey(user.uid))
          setItems(saved ? JSON.parse(saved) : [])
        } catch {
          setItems([])
        }
      } else {
        // Kullanıcı çıkış yaptı — sepeti temizle
        setUid(null)
        setItems([])
      }
      setHydrated(true)
    })
    return () => unsub()
  }, [])

  // Sepet değişince localStorage'a kullanıcıya özel key ile kaydet
  useEffect(() => {
    if (hydrated && uid) {
      localStorage.setItem(storageKey(uid), JSON.stringify(items))
    }
  }, [items, hydrated, uid])

  const addItem = useCallback((newItem: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id)
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...newItem, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity } : i))
      )
    }
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, totalCount, totalPrice, addItem, removeItem, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}
