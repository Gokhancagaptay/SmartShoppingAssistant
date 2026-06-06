'use client'

import React, { useState } from 'react'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Link as MuiLink, Stack, Divider,
} from '@mui/material'
import {
  Visibility, VisibilityOff, Email as EmailIcon,
  Lock as LockIcon, AutoAwesome as SparkleIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { app } from '@/lib/firebase'
import axios from 'axios'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.',
  'auth/wrong-password': 'Şifre hatalı.',
  'auth/invalid-email': 'Geçersiz e-posta adresi.',
  'auth/too-many-requests': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.',
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
}

/** Modern split-screen giriş sayfası */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('E-posta ve şifre alanları zorunludur.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const credential = await signInWithEmailAndPassword(getAuth(app), email, password)
      const token = await credential.user.getIdToken(true)
      let redirectTo = '/'
      try {
        const { data } = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (data?.role === 'admin') redirectTo = '/admin'
      } catch (err) {
        console.error('[Login] /api/auth/me başarısız:', err)
        // Backend erişilemez → role belirlenemiyor, home'a git
      }
      router.push(redirectTo)
    } catch (err: any) {
      setError(FIREBASE_ERRORS[err.code] || 'Giriş yapılırken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sol panel — branding (sadece md+) ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #4F46E5 0%, #7C3AED 50%, #0D9488 100%)',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Arka plan daire süslemeleri */}
        {[
          { size: 400, top: -100, right: -100, opacity: 0.12 },
          { size: 300, bottom: -80, left: -80, opacity: 0.1 },
          { size: 200, top: '40%', left: '60%', opacity: 0.08 },
        ].map((c, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: c.size,
              height: c.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              top: c.top,
              bottom: c.bottom,
              left: c.left,
              right: c.right,
            }}
          />
        ))}

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
          {/* Logo */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <SparkleIcon sx={{ fontSize: 36, color: '#fff' }} />
          </Box>

          <Typography variant="h3" fontWeight={800} color="white" gutterBottom>
            Market AI
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 400, mb: 4 }}>
            Yapay zeka destekli akıllı alışveriş asistanınız
          </Typography>

          {/* Özellik maddeleri */}
          {[
            '🛒 Kişiselleştirilmiş alışveriş listeleri',
            '🍽️ AI destekli tarif önerileri',
            '📊 Beslenme takibi ve analizi',
            '📦 Akıllı stok yönetimi',
          ].map((f) => (
            <Box
              key={f}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 1.5,
                px: 2,
                py: 1,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Typography variant="body2" color="white" textAlign="left">
                {f}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Sağ panel — form ── */}
      <Box
        sx={{
          flex: { xs: 1, md: 'none' },
          width: { xs: '100%', md: 480 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 5 },
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobilde logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SparkleIcon sx={{ fontSize: 24, color: '#fff' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Market AI
            </Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom>
            Hoş geldiniz 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Hesabınıza giriş yapın, kaldığınız yerden devam edin.
          </Typography>

          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="E-posta"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((p) => !p)}
                        edge="end"
                        size="small"
                        aria-label="Şifreyi göster/gizle"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3.5, py: 1.5, fontSize: 15, borderRadius: 3 }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Giriş Yap'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
              Hesabınız yok mu?
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            component={Link}
            href="/register"
            sx={{ py: 1.5, borderRadius: 3, fontWeight: 600 }}
          >
            Ücretsiz Kayıt Ol
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
