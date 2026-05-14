'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
  /** Sadece admin rolüne sahip kullanıcılar erişebilir */
  adminOnly?: boolean
}

/**
 * Kimlik doğrulama gerektiren sayfaları korur.
 * Giriş yapılmamışsa /login'e yönlendirir.
 * adminOnly=true ise admin olmayan kullanıcıları ana sayfaya yönlendirir.
 */
export default function AuthGuard({ children, adminOnly = false }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      fallbackTimerRef.current = setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }, 2500)
      return () => {
        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
      }
    }

    if (adminOnly && (user as { role?: string }).role !== 'admin') {
      router.replace('/')
    }
    return undefined
  }, [user, loading, adminOnly, router])

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Yükleniyor…</Typography>
      </Box>
    )
  }

  if (!user) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary" textAlign="center" sx={{ maxWidth: 360, px: 2 }}>
          Oturum açılmadı. Giriş sayfasına yönlendiriliyorsunuz…
        </Typography>
      </Box>
    )
  }

  return <>{children}</>
}
