'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { lightTheme, darkTheme } from '@/theme'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** Fiilen uygulanan tema: light veya dark */
  resolvedMode: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  resolvedMode: 'light',
})

export function useThemeMode() {
  return useContext(ThemeContext)
}

/** Uygulamayı saran tema sağlayıcısı. Dark mode tercihini localStorage'da saklar. */
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const [mode, setModeState] = useState<ThemeMode>('system')

  // localStorage'dan kaydedilmiş tercihi yükle
  useEffect(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode | null
    if (saved) setModeState(saved)
  }, [])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem('themeMode', newMode)
  }

  // Sistem tercihini veya kullanıcı seçimini çöz
  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return prefersDark ? 'dark' : 'light'
    return mode
  }, [mode, prefersDark])

  const activeTheme = resolvedMode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedMode }}>
      <ThemeProvider theme={activeTheme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
