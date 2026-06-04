'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'

export interface DietaryPreferences {
  tags: string[]
  custom_note: string
}

const DEFAULT_PREFS: DietaryPreferences = { tags: [], custom_note: '' }

/**
 * Kullanıcının diyet tercihlerini Firebase'den yükler ve kaydetmesini sağlar.
 * Tercihler ayrıca localStorage'a cache'lenerek sayfa yenilemelerinde
 * API isteği tamamlanmadan önce önceki değerler gösterilir.
 */
export function useDietaryPreferences() {
  const [preferences, setPreferences] = useState<DietaryPreferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    const auth = getAuth(app)
    const user = auth.currentUser
    if (!user) return

    // Önce localStorage cache'den yükle, sonra API'den güncelle
    const cached = localStorage.getItem(`dietary_prefs_${user.uid}`)
    if (cached) {
      try {
        setPreferences(JSON.parse(cached))
      } catch {
        // Bozuk cache — yoksay
      }
    }

    setLoading(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const { data } = await axios.get(
        `/api/auth/users/${user.uid}/dietary-preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const prefs: DietaryPreferences = {
        tags: data.tags ?? [],
        custom_note: data.custom_note ?? '',
      }
      setPreferences(prefs)
      localStorage.setItem(`dietary_prefs_${user.uid}`, JSON.stringify(prefs))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tercihler alınamadı'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const savePreferences = useCallback(async (prefs: DietaryPreferences) => {
    const auth = getAuth(app)
    const user = auth.currentUser
    if (!user) return

    setSaving(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      await axios.put(
        `/api/auth/users/${user.uid}/dietary-preferences`,
        prefs,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPreferences(prefs)
      localStorage.setItem(`dietary_prefs_${user.uid}`, JSON.stringify(prefs))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tercihler kaydedilemedi'
      setError(msg)
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  /**
   * Diyet tercihlerini AI prompt'una eklemek için kullanılacak
   * hazır metin. Tercih yoksa boş string döner.
   */
  const buildDietaryContext = useCallback((): string => {
    const parts: string[] = []
    if (preferences.tags.length > 0) {
      parts.push(`Diyet etiketlerim: ${preferences.tags.join(', ')}.`)
    }
    if (preferences.custom_note.trim()) {
      parts.push(`Ek notum: ${preferences.custom_note.trim()}`)
    }
    return parts.length > 0
      ? `\n\n[Kullanıcı diyet tercihleri: ${parts.join(' ')}]`
      : ''
  }, [preferences])

  return { preferences, loading, saving, error, savePreferences, fetchPreferences, buildDietaryContext }
}
