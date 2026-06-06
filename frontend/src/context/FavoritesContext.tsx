'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { ref, set, remove, onValue } from 'firebase/database'
import { app, database } from '@/lib/firebase'

export interface FavoriteProduct {
  id: string
  name: string
  price: number
  image_url: string
  category: string
  stock: number
  unit?: string
  avg_rating?: number
  review_count?: number
}

interface FavoritesContextValue {
  favorites: Record<string, FavoriteProduct>
  isFavorite: (productId: string) => boolean
  toggleFavorite: (product: FavoriteProduct) => Promise<void>
  favoriteCount: number
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: {},
  isFavorite: () => false,
  toggleFavorite: async () => {},
  favoriteCount: 0,
})

export function useFavorites() {
  return useContext(FavoritesContext)
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Record<string, FavoriteProduct>>({})
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    const auth = getAuth(app)
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null)
      if (!user) setFavorites({})
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!uid || !database) return
    const favRef = ref(database, `users/${uid}/favorites`)
    const unsub = onValue(favRef, (snap) => {
      setFavorites(snap.val() || {})
    })
    return () => unsub()
  }, [uid])

  const toggleFavorite = useCallback(
    async (product: FavoriteProduct) => {
      if (!uid || !database) return
      const favRef = ref(database, `users/${uid}/favorites/${product.id}`)
      if (favorites[product.id]) {
        await remove(favRef)
      } else {
        await set(favRef, product)
      }
    },
    [uid, favorites],
  )

  const isFavorite = useCallback((productId: string) => !!favorites[productId], [favorites])
  const favoriteCount = Object.keys(favorites).length

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, favoriteCount }}>
      {children}
    </FavoritesContext.Provider>
  )
}
