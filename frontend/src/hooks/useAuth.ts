import { useState, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const AUTH_READY_MS = 8000

/**
 * Firebase oturum durumu. Bazı tarayıcılarda (IndexedDB / ağ) onAuthStateChanged
 * gecikebildiği için authStateReady + zaman aşımı ile sonsuz "yükleniyor" önlenir.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let cancelled = false

    const run = async () => {
      try {
        await Promise.race([
          auth.authStateReady(),
          new Promise<void>((resolve) => {
            setTimeout(resolve, AUTH_READY_MS)
          }),
        ])
      } catch {
        /* authStateReady hata verse bile devam */
      }
      if (cancelled) return

      setUser(auth.currentUser)
      setLoading(false)

      unsub = onAuthStateChanged(auth, (u) => {
        if (!cancelled) {
          setUser(u)
          setLoading(false)
        }
      })
    }

    void run()

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  return { user, loading }
}
