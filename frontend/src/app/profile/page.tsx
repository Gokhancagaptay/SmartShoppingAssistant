'use client'

import React, { useState, useEffect } from 'react'
import {
  Container, Box, Typography, Grid, Card, Tab, Tabs, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Tooltip, CircularProgress, Alert, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, alpha, useTheme,
} from '@mui/material'
import {
  Person as PersonIcon, ShoppingCart as OrderIcon,
  LocationOn as AddressIcon, CreditCard as CardIcon,
  Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon,
  Warning as WarningIcon, CheckCircle as SaveIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  name: string
  surname: string
  phone: string
  email: string
  role?: string
}

interface SavedAddress {
  id: string
  title: string
  fullName: string
  phone: string
  city: string
  district: string
  detail: string
}

interface SavedCard {
  id: string
  label: string
  cardHolder: string
  last4: string
  expiry: string
}

interface UserOrder {
  order_id: string
  total_price: number
  status: string
  created_at: string
  items: { name: string; quantity: number; price: number }[]
  payment_method: string
  address?: { city?: string; district?: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Beklemede',     color: '#F59E0B' },
  processing: { label: 'Hazırlanıyor',  color: '#6366F1' },
  shipped:    { label: 'Kargoda',       color: '#3B82F6' },
  delivered:  { label: 'Teslim Edildi', color: '#10B981' },
  cancelled:  { label: 'İptal',         color: '#EF4444' },
}

const fmtPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}

async function getAuthHeader() {
  const token = await getAuth(app).currentUser?.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const theme = useTheme()
  const router = useRouter()
  const queryClient = useQueryClient()

  const toast = useToast()
  const [activeTab, setActiveTab] = useState(0)
  const [uid, setUid] = useState<string | null>(null)
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false)

  // Address dialog
  const emptyAddr = { title: '', fullName: '', phone: '', city: '', district: '', detail: '' }
  const [addrDialog, setAddrDialog] = useState(false)
  const [addrForm, setAddrForm] = useState(emptyAddr)
  const [addrError, setAddrError] = useState<string | null>(null)

  // Profile edit state
  const [profileForm, setProfileForm] = useState<UserProfile | null>(null)
  const [profileEditMode, setProfileEditMode] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(app), (u) => setUid(u?.uid ?? null))
    return () => unsub()
  }, [])

  // ── Queries ──
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery<UserProfile>(
    'user-profile',
    async () => {
      const headers = await getAuthHeader()
      const res = await axios.get('/api/auth/me', { headers })
      return res.data
    },
    { enabled: !!uid, onSuccess: (d) => { if (!profileEditMode) setProfileForm(d) } }
  )

  const { data: orders = [], isLoading: ordersLoading } = useQuery<UserOrder[]>(
    'user-orders',
    async () => {
      const headers = await getAuthHeader()
      const res = await axios.get('/api/auth/orders', { headers })
      const data = res.data
      const list: UserOrder[] = Array.isArray(data) ? data : Object.values(data || {})
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },
    { enabled: !!uid && activeTab === 1, refetchInterval: activeTab === 1 ? 30_000 : false }
  )

  const { data: addresses = [], isLoading: addrLoading, refetch: refetchAddresses } = useQuery<SavedAddress[]>(
    'user-addresses',
    async () => {
      const headers = await getAuthHeader()
      const res = await axios.get(`/api/auth/users/${uid}/saved-addresses`, { headers })
      return Array.isArray(res.data) ? res.data : res.data.addresses || []
    },
    { enabled: !!uid && activeTab === 2 }
  )

  // Cards from localStorage
  const [cards, setCards] = useState<SavedCard[]>([])
  useEffect(() => {
    if (!uid) return
    try {
      const raw = localStorage.getItem(`market_ai_cards_${uid}`)
      setCards(raw ? JSON.parse(raw) : [])
    } catch { setCards([]) }
  }, [uid, activeTab])

  // ── Mutations ──
  const saveProfile = useMutation(
    async (data: UserProfile) => {
      const headers = await getAuthHeader()
      return axios.put('/api/auth/update', data, { headers })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('user-profile')
        setProfileEditMode(false)
        setProfileSaveError(null)
        toast.success('Profil bilgileri güncellendi.')
      },
      onError: (err: any) => {
        const msg = err.response?.data?.detail || 'Profil kaydedilemedi. Lütfen tekrar deneyin.'
        setProfileSaveError(msg)
        toast.error(msg)
      },
    }
  )

  const addAddress = useMutation(
    async (data: typeof emptyAddr) => {
      const headers = await getAuthHeader()
      return axios.post(`/api/auth/users/${uid}/saved-addresses`, data, { headers })
    },
    {
      onSuccess: () => { refetchAddresses(); setAddrDialog(false); setAddrForm(emptyAddr); toast.success('Adres kaydedildi.') },
      onError: (err: any) => setAddrError(err.response?.data?.detail || 'Adres kaydedilemedi. Lütfen tekrar deneyin.'),
    }
  )

  const deleteAddress = useMutation(
    async (addrId: string) => {
      const headers = await getAuthHeader()
      return axios.delete(`/api/auth/users/${uid}/saved-addresses/${addrId}`, { headers })
    },
    {
      onSuccess: () => { refetchAddresses(); toast.success('Adres silindi.') },
      onError: () => toast.error('Adres silinemedi. Lütfen tekrar deneyin.'),
    }
  )

  const deleteAccount = useMutation(
    async () => {
      const headers = await getAuthHeader()
      return axios.delete('/api/auth/delete-account', { headers })
    },
    {
      onSuccess: async () => {
        queryClient.clear()
        await signOut(getAuth(app))
        router.replace('/login')
      },
    }
  )

  const deleteCard = (cardId: string) => {
    if (!uid) return
    const updated = cards.filter(c => c.id !== cardId)
    localStorage.setItem(`market_ai_cards_${uid}`, JSON.stringify(updated))
    setCards(updated)
  }

  const HEADER_STYLE = {
    fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' as const, letterSpacing: 0.7, color: 'text.secondary',
  }

  return (
    <AuthGuard userOnly>
      <MainLayout>
        <Container maxWidth="lg" sx={{ pb: 6 }}>

          {/* Hero */}
          <Box
            sx={{
              borderRadius: 4,
              background: 'linear-gradient(135deg,#0F172A 0%,#1E1B4B 50%,#312E81 100%)',
              p: { xs: 3, sm: 4 },
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <Stack direction="row" alignItems="center" spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
              <Avatar sx={{ width: 64, height: 64, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', fontSize: 26, fontWeight: 800, boxShadow: '0 4px 14px rgba(99,102,241,0.5)' }}>
                {profile?.name?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800} color="white">
                  {profileLoading ? '...' : `${profile?.name ?? ''} ${profile?.surname ?? ''}`}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {profile?.email ?? ''}
                </Typography>
                {profile?.role === 'admin' && (
                  <Chip label="🛡️ Admin" size="small" sx={{ mt: 0.5, bgcolor: 'rgba(99,102,241,0.3)', color: 'white', fontWeight: 700, fontSize: '0.72rem' }} />
                )}
              </Box>
            </Stack>
          </Box>

          {/* Tab card */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  px: 2,
                  '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 52 },
                }}
              >
                <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Hesabım" />
                <Tab icon={<OrderIcon fontSize="small" />} iconPosition="start" label="Siparişlerim" />
                <Tab icon={<AddressIcon fontSize="small" />} iconPosition="start" label="Adreslerim" />
                <Tab icon={<CardIcon fontSize="small" />} iconPosition="start" label="Kartlarım" />
              </Tabs>
            </Box>

            {/* ══ Hesabım ══ */}
            {activeTab === 0 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {profileLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : profileForm ? (
                  <Box maxWidth={520}>
                    {profileSaveError && (
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setProfileSaveError(null)}>
                        {profileSaveError}
                      </Alert>
                    )}
                    <Stack spacing={2.5}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth label="Ad" value={profileForm.name}
                            disabled={!profileEditMode}
                            onChange={e => setProfileForm(p => p ? { ...p, name: e.target.value } : p)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth label="Soyad" value={profileForm.surname}
                            disabled={!profileEditMode}
                            onChange={e => setProfileForm(p => p ? { ...p, surname: e.target.value } : p)}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                          />
                        </Grid>
                      </Grid>
                      <TextField
                        fullWidth label="E-posta" value={profileForm.email}
                        disabled={!profileEditMode}
                        onChange={e => setProfileForm(p => p ? { ...p, email: e.target.value } : p)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <TextField
                        fullWidth label="Telefon" value={profileEditMode ? profileForm.phone : (profileForm.phone || '—')}
                        disabled={!profileEditMode}
                        onChange={e => setProfileForm(p => p ? { ...p, phone: fmtPhone(e.target.value) } : p)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1.5} mt={3}>
                      {!profileEditMode ? (
                        <Button
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => setProfileEditMode(true)}
                          sx={{ borderRadius: 2.5, fontWeight: 700 }}
                        >
                          Düzenle
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="contained"
                            startIcon={saveProfile.isLoading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            disabled={saveProfile.isLoading}
                            onClick={() => profileForm && saveProfile.mutate(profileForm)}
                            sx={{ borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                          >
                            Kaydet
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => { setProfileEditMode(false); setProfileForm(profile ?? null); setProfileSaveError(null) }}
                            sx={{ borderRadius: 2.5 }}
                          >
                            İptal
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Box>
                ) : null}

                <Divider sx={{ my: 4 }} />

                <Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteAccountDialog(true)}
                    sx={{ borderRadius: 2.5, fontWeight: 700 }}
                  >
                    Hesabı Sil
                  </Button>
                </Box>
              </Box>
            )}

            {/* ══ Siparişlerim ══ */}
            {activeTab === 1 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {ordersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : orders.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <Typography fontSize={40} mb={1}>🛒</Typography>
                    <Typography color="text.secondary">Henüz sipariş yok.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {orders.map((order) => {
                      const sc = STATUS_MAP[order.status] ?? { label: order.status, color: '#6366F1' }
                      const dateStr = new Date(order.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
                      return (
                        <Card
                          key={order.order_id}
                          elevation={0}
                          sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                        >
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                            <Box>
                              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace' }}>
                                  #{order.order_id}
                                </Typography>
                                <Chip
                                  label={sc.label}
                                  size="small"
                                  sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: alpha(sc.color, 0.12), color: sc.color }}
                                />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">{dateStr}</Typography>
                              {order.items?.length > 0 && (
                                <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ maxWidth: 360 }}>
                                  {order.items.slice(0, 3).map(i => `${i.name} x${i.quantity}`).join(' · ')}
                                  {order.items.length > 3 && ` +${order.items.length - 3} ürün`}
                                </Typography>
                              )}
                            </Box>
                            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={0.5}>
                              <Typography variant="h6" fontWeight={800} color="primary">
                                ₺{Number(order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {order.payment_method === 'cash' ? 'Kapıda Ödeme' : 'Kartla Ödeme'}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Card>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            )}

            {/* ══ Adreslerim ══ */}
            {activeTab === 2 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction="row" justifyContent="flex-end" mb={2.5}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => { setAddrForm(emptyAddr); setAddrError(null); setAddrDialog(true) }}
                    sx={{ borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                  >
                    Yeni Adres
                  </Button>
                </Stack>
                {addrLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : addresses.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <Typography fontSize={40} mb={1}>📍</Typography>
                    <Typography color="text.secondary">Kayıtlı adres yok.</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {addresses.map((addr) => (
                      <Grid item xs={12} sm={6} key={addr.id}>
                        <Card
                          elevation={0}
                          sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body1" fontWeight={700} gutterBottom>{addr.title}</Typography>
                              <Typography variant="body2" color="text.secondary">{addr.fullName}</Typography>
                              <Typography variant="body2" color="text.secondary">{addr.phone}</Typography>
                              <Typography variant="body2" color="text.secondary" mt={0.5}>
                                {addr.district && `${addr.district}, `}{addr.city}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">{addr.detail}</Typography>
                            </Box>
                            <Tooltip title="Sil">
                              <IconButton
                                size="small"
                                onClick={() => deleteAddress.mutate(addr.id)}
                                disabled={deleteAddress.isLoading}
                                sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}

            {/* ══ Kartlarım ══ */}
            {activeTab === 3 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {cards.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <Typography fontSize={40} mb={1}>💳</Typography>
                    <Typography color="text.secondary">Kayıtlı kart yok.</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Ödeme yaparken kart kaydedebilirsiniz.
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {cards.map((card) => (
                      <Grid item xs={12} sm={6} key={card.id}>
                        <Card
                          elevation={0}
                          sx={{
                            p: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 3,
                            background: 'linear-gradient(135deg,#1E1B4B,#312E81)',
                            color: 'white',
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }} gutterBottom>
                                {card.label}
                              </Typography>
                              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: 3, fontFamily: 'monospace' }}>
                                •••• •••• •••• {card.last4}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                                {card.cardHolder}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                                {card.expiry}
                              </Typography>
                            </Box>
                            <Tooltip title="Sil">
                              <IconButton
                                size="small"
                                onClick={() => deleteCard(card.id)}
                                sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#EF4444', bgcolor: 'rgba(239,68,68,0.15)' } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            )}
          </Card>
        </Container>

        {/* ── Adres Ekle Dialog ── */}
        <Dialog open={addrDialog} onClose={() => setAddrDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', pb: 2 }}>
            <Typography variant="h6" fontWeight={700} color="white">Yeni Adres Ekle</Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: '20px !important' }}>
            {addrError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAddrError(null)}>{addrError}</Alert>}
            <Stack spacing={2}>
              <TextField fullWidth label="Adres Başlığı *" value={addrForm.title} onChange={e => setAddrForm(p => ({ ...p, title: e.target.value }))} placeholder="Evim, İş Yerim…" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField fullWidth label="Ad Soyad *" value={addrForm.fullName} onChange={e => setAddrForm(p => ({ ...p, fullName: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <TextField fullWidth label="Telefon" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: fmtPhone(e.target.value) }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField fullWidth label="İl *" value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth label="İlçe" value={addrForm.district} onChange={e => setAddrForm(p => ({ ...p, district: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Grid>
              </Grid>
              <TextField fullWidth multiline rows={2} label="Adres Detayı *" value={addrForm.detail} onChange={e => setAddrForm(p => ({ ...p, detail: e.target.value }))} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={() => setAddrDialog(false)} variant="outlined" sx={{ borderRadius: 2.5 }}>İptal</Button>
            <Button
              onClick={() => {
                if (!addrForm.title || !addrForm.fullName || !addrForm.city || !addrForm.detail) {
                  setAddrError('Başlık, ad soyad, il ve adres detayı zorunludur.')
                  return
                }
                addAddress.mutate(addrForm)
              }}
              variant="contained"
              disabled={addAddress.isLoading}
              sx={{ borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
            >
              {addAddress.isLoading ? <CircularProgress size={18} color="inherit" /> : 'Kaydet'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Hesap Silme Onay ── */}
        <Dialog open={deleteAccountDialog} onClose={() => setDeleteAccountDialog(false)} PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
            <Avatar sx={{ bgcolor: alpha('#EF4444', 0.12), width: 40, height: 40 }}>
              <WarningIcon sx={{ color: '#EF4444', fontSize: 20 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>Hesabı Sil</Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Hesabınızı silmek istediğinizden emin misiniz? Tüm verileriniz (siparişler, adresler, stok bilgileri) <strong>kalıcı olarak silinir</strong> ve bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={() => setDeleteAccountDialog(false)} variant="outlined" sx={{ borderRadius: 2.5 }}>İptal</Button>
            <Button
              onClick={() => deleteAccount.mutate()}
              variant="contained"
              color="error"
              disabled={deleteAccount.isLoading}
              sx={{ borderRadius: 2.5, fontWeight: 700 }}
            >
              {deleteAccount.isLoading ? <CircularProgress size={18} color="inherit" /> : 'Hesabımı Sil'}
            </Button>
          </DialogActions>
        </Dialog>

      </MainLayout>
    </AuthGuard>
  )
}
