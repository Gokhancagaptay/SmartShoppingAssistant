'use client'

import React, { useState } from 'react'
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Link as MuiLink, Stack, Grid, Divider,
} from '@mui/material'
import {
  Visibility, VisibilityOff, Email as EmailIcon, Lock as LockIcon,
  Person as PersonIcon, Phone as PhoneIcon, AutoAwesome as SparkleIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { app } from '@/lib/firebase'
import axios from 'axios'

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda.',
  'auth/invalid-email': 'Geçersiz e-posta adresi.',
  'auth/weak-password': 'Şifre çok zayıf. En az 6 karakter girin.',
}

/** Modern split-screen kayıt sayfası */
export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', surname: '', email: '', password: '', phone: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const { name, surname, email, password, phone } = form
    if (!name || !surname || !email || !password) {
      setError('Ad, soyad, e-posta ve şifre zorunludur.')
      return
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const credential = await createUserWithEmailAndPassword(getAuth(app), email, password)
      await updateProfile(credential.user, { displayName: `${name} ${surname}` })
      const token = await credential.user.getIdToken()
      await axios.post(
        '/api/auth/register',
        { email, password, role: 'user', name, surname, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      router.push('/')
    } catch (err: any) {
      setError(FIREBASE_ERRORS[err.code] || err.message || 'Kayıt sırasında bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sol panel — branding ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #059669 0%, #0D9488 40%, #4F46E5 100%)',
          p: 6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {[
          { size: 350, top: -80, right: -80 },
          { size: 250, bottom: -60, left: -60 },
          { size: 180, top: '35%', right: '10%' },
        ].map((c, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: c.size,
              height: c.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              top: c.top,
              bottom: c.bottom,
              left: c.left,
              right: c.right,
            }}
          />
        ))}

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
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
            Aramıza Katıl
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 400, mb: 5 }}>
            Market AI ile alışverişi akıllılaştır
          </Typography>

          {[
            { emoji: '⚡', title: 'Hızlı Kurulum', desc: '2 dakikada hesap oluştur' },
            { emoji: '🔒', title: 'Güvenli', desc: 'Verileriniz şifreli korunur' },
            { emoji: '🎯', title: 'Kişisel', desc: 'Size özel öneriler alın' },
          ].map((f) => (
            <Box
              key={f.title}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                px: 2.5,
                py: 1.5,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                textAlign: 'left',
              }}
            >
              <Typography fontSize={24}>{f.emoji}</Typography>
              <Box>
                <Typography variant="body2" color="white" fontWeight={700}>
                  {f.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {f.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Sağ panel — form ── */}
      <Box
        sx={{
          flex: { xs: 1, md: 'none' },
          width: { xs: '100%', md: 520 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, sm: 5 },
          bgcolor: 'background.default',
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #059669, #4F46E5)',
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
            Hesap Oluştur 🚀
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Ücretsiz hesabınızı oluşturun, hemen kullanmaya başlayın.
          </Typography>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleRegister} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ad"
                  value={form.name}
                  onChange={handleChange('name')}
                  autoComplete="given-name"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Soyad"
                  value={form.surname}
                  onChange={handleChange('surname')}
                  autoComplete="family-name"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="E-posta"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  autoComplete="email"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  autoComplete="new-password"
                  required
                  helperText="En az 6 karakter"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Telefon (isteğe bağlı)"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  autoComplete="tel"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3.5, py: 1.5, fontSize: 15, borderRadius: 3 }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Hesap Oluştur'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
              Zaten hesabınız var mı?
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            component={Link}
            href="/login"
            sx={{ py: 1.5, borderRadius: 3, fontWeight: 600 }}
          >
            Giriş Yap
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
