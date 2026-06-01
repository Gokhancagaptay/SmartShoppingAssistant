'use client'

import React, { useState, useMemo } from 'react'
import {
  Container, Box, Typography, Grid, Card, Tab, Tabs, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Tooltip, CircularProgress, Alert, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  InputAdornment, alpha, useTheme,
} from '@mui/material'
import {
  People as PeopleIcon, Inventory as ProductIcon, Add as AddIcon,
  Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  TrendingUp as RevenueIcon, ShoppingCart as OrderIcon,
  Search as SearchIcon, AdminPanelSettings as AdminIcon,
  Close as CloseIcon, Warning as WarningIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: 'Meyve & Sebze', value: 'meyve_sebze', emoji: '🥦', color: '#10B981' },
  { label: 'Et & Tavuk',    value: 'et_tavuk',    emoji: '🥩', color: '#EF4444' },
  { label: 'Süt Ürünleri',  value: 'sut',         emoji: '🥛', color: '#3B82F6' },
  { label: 'Fırın',         value: 'firin',       emoji: '🍞', color: '#F59E0B' },
  { label: 'İçecek',        value: 'icecek',      emoji: '🧃', color: '#8B5CF6' },
  { label: 'Dondurulmuş',   value: 'dondurulmus', emoji: '🧊', color: '#06B6D4' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

interface Product {
  _id: string
  name: string
  price: number
  stock: number
  image_url: string
  category: string
  unit?: string
}

const emptyForm = { name: '', price: '', stock: '', image_url: '', category: 'meyve_sebze', unit: 'adet' }

async function getAuthHeader() {
  const user = getAuth(app).currentUser
  if (!user) throw new Error('Oturum açılmamış')
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function UserAvatar({ name, surname }: { name?: string; surname?: string }) {
  const initials = `${(name ?? '?')[0]}${(surname ?? '')[0] ?? ''}`.toUpperCase()
  const hue = ((name ?? '').charCodeAt(0) * 37) % 360
  return (
    <Avatar
      sx={{
        width: 34, height: 34, fontSize: 13, fontWeight: 800,
        background: `hsl(${hue},55%,45%)`,
        flexShrink: 0,
      }}
    >
      {initials}
    </Avatar>
  )
}

function ProductImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const firstChar = name[0]?.toUpperCase() ?? '?'
  if (!src || failed) {
    return (
      <Avatar variant="rounded" sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: alpha('#6366F1', 0.12), fontSize: 22 }}>
        {firstChar}
      </Avatar>
    )
  }
  return (
    <Box
      component="img"
      src={src}
      alt={name}
      sx={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 1.5 }}
      onError={() => setFailed(true)}
    />
  )
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState(0)
  const [productDialog, setProductDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; product?: Product }>({ open: false, mode: 'add' })
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')

  // ── Queries ──
  const { data: stats } = useQuery('admin-stats', async () => {
    const res = await axios.get('/api/admin/dashboard/stats')
    return res.data
  })

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery(
    'admin-users',
    async () => {
      const headers = await getAuthHeader()
      const res = await axios.get('/api/admin/users', { headers })
      return res.data
    },
    { enabled: activeTab === 0, retry: false }
  )

  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>(
    'admin-products',
    async () => {
      const res = await axios.get('/api/products/')
      return Array.isArray(res.data) ? res.data : res.data.products || []
    },
    { enabled: activeTab === 1 }
  )

  // ── Mutations ──
  const createProduct = useMutation(
    async (data: typeof emptyForm) => {
      const headers = await getAuthHeader()
      return axios.post('/api/products/', {
        name: data.name, price: parseFloat(data.price), stock: parseInt(data.stock),
        image_url: data.image_url, category: data.category, unit: data.unit,
      }, { headers })
    },
    {
      onSuccess: () => { queryClient.invalidateQueries('admin-products'); closeDialog() },
      onError: (err: any) => setFormError(err.response?.data?.detail || 'Ürün eklenemedi.'),
    }
  )

  const updateProduct = useMutation(
    async ({ id, data }: { id: string; data: typeof emptyForm }) => {
      const headers = await getAuthHeader()
      return axios.put(`/api/products/${id}`, {
        name: data.name, price: parseFloat(data.price), stock: parseInt(data.stock),
        image_url: data.image_url, category: data.category, unit: data.unit,
      }, { headers })
    },
    {
      onSuccess: () => { queryClient.invalidateQueries('admin-products'); closeDialog() },
      onError: (err: any) => setFormError(err.response?.data?.detail || 'Ürün güncellenemedi.'),
    }
  )

  const deleteProduct = useMutation(
    async (id: string) => {
      const headers = await getAuthHeader()
      return axios.delete(`/api/products/${id}`, { headers })
    },
    { onSuccess: () => { queryClient.invalidateQueries('admin-products'); setDeleteConfirm(null) } }
  )

  // ── Handlers ──
  const closeDialog = () => {
    setProductDialog(p => ({ ...p, open: false }))
    setForm(emptyForm)
    setFormError(null)
  }

  const openAddDialog = () => {
    setForm(emptyForm)
    setFormError(null)
    setProductDialog({ open: true, mode: 'add' })
  }

  const openEditDialog = (product: Product) => {
    setForm({
      name: product.name, price: String(product.price), stock: String(product.stock),
      image_url: product.image_url, category: product.category, unit: product.unit || 'adet',
    })
    setFormError(null)
    setProductDialog({ open: true, mode: 'edit', product })
  }

  const handleFormSubmit = () => {
    if (!form.name || !form.price || !form.stock || !form.category) {
      setFormError('Ad, fiyat, stok ve kategori zorunludur.')
      return
    }
    if (productDialog.mode === 'add') createProduct.mutate(form)
    else if (productDialog.product) updateProduct.mutate({ id: productDialog.product._id, data: form })
  }

  // ── Filtered lists ──
  const filteredUsers = useMemo(() =>
    userSearch ? users.filter((u: any) =>
      `${u.name} ${u.surname} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
    ) : users
  , [users, userSearch])

  const filteredProducts = useMemo(() => {
    let list = products
    if (catFilter) list = list.filter(p => p.category === catFilter)
    if (productSearch) list = list.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    return list
  }, [products, productSearch, catFilter])

  // ── Stats ──
  const statCards = [
    { label: 'Toplam Kullanıcı', value: stats?.total_users ?? '—', icon: <PeopleIcon />, gradient: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#6366F1' },
    { label: 'Toplam Ürün', value: (products.length || stats?.total_products) ?? '—', icon: <ProductIcon />, gradient: 'linear-gradient(135deg,#10B981,#0D9488)', color: '#10B981' },
    { label: 'Toplam Sipariş', value: stats?.total_orders ?? '—', icon: <OrderIcon />, gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)', color: '#F59E0B' },
    { label: 'Toplam Gelir', value: stats?.total_revenue ? `₺${Number(stats.total_revenue).toLocaleString('tr-TR')}` : '—', icon: <RevenueIcon />, gradient: 'linear-gradient(135deg,#3B82F6,#6366F1)', color: '#3B82F6' },
  ]

  const isMutating = createProduct.isLoading || updateProduct.isLoading

  return (
    <AuthGuard adminOnly>
      <MainLayout>
        <Container maxWidth="xl" sx={{ pb: 6 }}>

          {/* ── Hero ── */}
          <Box
            sx={{
              borderRadius: 4,
              background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
              p: { xs: 3, sm: 4 },
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -40, right: '15%', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                icon={<AdminIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
                label="Yönetici Erişimi"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, mb: 2, fontSize: '0.72rem' }}
              />
              <Typography variant="h4" fontWeight={800} color="white" gutterBottom>
                Admin Paneli ⚙️
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.78)', maxWidth: 460 }}>
                Kullanıcıları ve ürünleri yönetin. Stok güncelleyin, yeni ürün ekleyin.
              </Typography>
            </Box>
          </Box>

          {/* ── Stat cards ── */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {statCards.map(s => (
              <Grid item xs={12} sm={6} lg={3} key={s.label}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${alpha(s.color, 0.2)}`, borderColor: alpha(s.color, 0.3) },
                  }}
                >
                  <Avatar sx={{ background: s.gradient, width: 52, height: 52, boxShadow: `0 4px 14px ${alpha(s.color, 0.35)}` }}>
                    {s.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={800} lineHeight={1.1}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* ── Tab card ── */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  px: 2,
                  '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 56 },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                    background: activeTab === 0
                      ? 'linear-gradient(90deg,#6366F1,#8B5CF6)'
                      : 'linear-gradient(90deg,#10B981,#0D9488)',
                  },
                }}
              >
                <Tab
                  icon={<PeopleIcon fontSize="small" />}
                  iconPosition="start"
                  label={`Kullanıcılar${users.length ? ` (${users.length})` : ''}`}
                  sx={{ color: activeTab === 0 ? '#6366F1' : 'text.secondary', '&.Mui-selected': { color: '#6366F1' } }}
                />
                <Tab
                  icon={<ProductIcon fontSize="small" />}
                  iconPosition="start"
                  label={`Ürünler${products.length ? ` (${products.length})` : ''}`}
                  sx={{ color: activeTab === 1 ? '#10B981' : 'text.secondary', '&.Mui-selected': { color: '#10B981' } }}
                />
              </Tabs>
            </Box>

            {/* ══ Users tab ══ */}
            {activeTab === 0 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} mb={2.5}>
                  <TextField
                    size="small"
                    placeholder="Ad, soyad veya e-posta ara…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    sx={{ maxWidth: 380, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                    }}
                  />
                  <Tooltip title="Yenile">
                    <IconButton onClick={() => refetchUsers()} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {usersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredUsers.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <Typography fontSize={40} mb={1}>👥</Typography>
                    <Typography variant="body1" color="text.secondary">
                      {userSearch ? `"${userSearch}" için kullanıcı bulunamadı.` : 'Henüz kullanıcı yok.'}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Kullanıcı</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>E-posta</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Rol</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Telefon</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredUsers.map((u: any, i: number) => (
                          <TableRow
                            key={i}
                            hover
                            sx={{ '&:last-child td': { border: 0 }, transition: 'background 0.15s' }}
                          >
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1.5}>
                                <UserAvatar name={u.name} surname={u.surname} />
                                <Typography variant="body2" fontWeight={600}>
                                  {u.name} {u.surname}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                                {u.email}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={u.role === 'admin' ? '🛡️ Admin' : '👤 Kullanıcı'}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  ...(u.role === 'admin'
                                    ? { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white' }
                                    : { bgcolor: alpha(theme.palette.text.secondary, 0.1), color: 'text.secondary' }),
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {u.phone || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* ══ Products tab ══ */}
            {activeTab === 1 && (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {/* Toolbar */}
                <Stack spacing={2} mb={2.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}>
                    <TextField
                      size="small"
                      placeholder="Ürün adı ara…"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      sx={{ maxWidth: 340, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                      }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Yenile">
                        <IconButton onClick={() => refetchProducts()} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={openAddDialog}
                        sx={{
                          borderRadius: 2.5,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                          boxShadow: `0 4px 14px ${alpha('#6366F1', 0.4)}`,
                          '&:hover': { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' },
                        }}
                      >
                        Ürün Ekle
                      </Button>
                    </Stack>
                  </Stack>

                  {/* Category filter chips */}
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Chip
                      label="Tümü"
                      size="small"
                      onClick={() => setCatFilter('')}
                      sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        ...(catFilter === ''
                          ? { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', border: 'none' }
                          : { border: `1px solid ${theme.palette.divider}` }),
                      }}
                    />
                    {CATEGORIES.map(cat => (
                      <Chip
                        key={cat.value}
                        label={`${cat.emoji} ${cat.label}`}
                        size="small"
                        onClick={() => setCatFilter(catFilter === cat.value ? '' : cat.value)}
                        sx={{
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          ...(catFilter === cat.value
                            ? { bgcolor: cat.color, color: 'white', border: 'none', boxShadow: `0 2px 8px ${alpha(cat.color, 0.4)}` }
                            : { border: `1px solid ${theme.palette.divider}`, '&:hover': { borderColor: cat.color, color: cat.color } }),
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>

                {productsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredProducts.length === 0 ? (
                  <Box textAlign="center" py={6}>
                    <Typography fontSize={40} mb={1}>📦</Typography>
                    <Typography variant="body1" color="text.secondary">
                      {productSearch || catFilter ? 'Filtreyle eşleşen ürün yok.' : 'Henüz ürün eklenmemiş.'}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary', width: 60 }}>Görsel</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Ürün</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Kategori</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Fiyat</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary' }}>Stok</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.secondary', width: 80 }}>İşlem</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredProducts.map(product => {
                          const isLow = product.stock > 0 && product.stock <= 5
                          const isOut = product.stock === 0
                          const cat = CAT_MAP[product.category]
                          return (
                            <TableRow
                              key={product._id}
                              hover
                              sx={{
                                '&:last-child td': { border: 0 },
                                transition: 'background 0.15s',
                                ...(isOut && { bgcolor: alpha('#EF4444', isDark ? 0.07 : 0.03) }),
                                ...(isLow && !isOut && { bgcolor: alpha('#F59E0B', isDark ? 0.07 : 0.03) }),
                              }}
                            >
                              <TableCell>
                                <ProductImage src={product.image_url} name={product.name} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                                {product.unit && (
                                  <Typography variant="caption" color="text.secondary">/ {product.unit}</Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {cat ? (
                                  <Chip
                                    label={`${cat.emoji} ${cat.label}`}
                                    size="small"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '0.72rem',
                                      bgcolor: alpha(cat.color, isDark ? 0.2 : 0.1),
                                      color: isDark ? `${cat.color}` : cat.color,
                                      border: `1px solid ${alpha(cat.color, 0.3)}`,
                                    }}
                                  />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">{product.category}</Typography>
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={800} color="primary">
                                  {product.price.toFixed(2)} ₺
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={isOut ? 'Tükendi' : product.stock}
                                  size="small"
                                  icon={isLow || isOut ? <WarningIcon sx={{ fontSize: '12px !important' }} /> : undefined}
                                  sx={{
                                    fontWeight: 800,
                                    minWidth: 52,
                                    ...(isOut
                                      ? { bgcolor: alpha('#EF4444', 0.15), color: '#EF4444', '& .MuiChip-icon': { color: '#EF4444' } }
                                      : isLow
                                      ? { bgcolor: alpha('#F59E0B', 0.15), color: '#D97706', '& .MuiChip-icon': { color: '#D97706' } }
                                      : { bgcolor: alpha('#10B981', 0.12), color: '#059669' }),
                                  }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Stack direction="row" justifyContent="center" spacing={0.25}>
                                  <Tooltip title="Düzenle">
                                    <IconButton
                                      size="small"
                                      onClick={() => openEditDialog(product)}
                                      sx={{ color: '#6366F1', '&:hover': { bgcolor: alpha('#6366F1', 0.1) } }}
                                    >
                                      <EditIcon sx={{ fontSize: 17 }} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Sil">
                                    <IconButton
                                      size="small"
                                      onClick={() => setDeleteConfirm(product)}
                                      sx={{ color: '#EF4444', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}
                                    >
                                      <DeleteIcon sx={{ fontSize: 17 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </Card>
        </Container>

        {/* ── Ürün Ekle / Düzenle Dialog ── */}
        <Dialog
          open={productDialog.open}
          onClose={closeDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4 } }}
        >
          <DialogTitle
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: productDialog.mode === 'add'
                ? 'linear-gradient(135deg,#6366F1,#8B5CF6)'
                : 'linear-gradient(135deg,#10B981,#0D9488)',
              color: 'white', pb: 2,
            }}
          >
            <Typography variant="h6" fontWeight={700} color="white">
              {productDialog.mode === 'add' ? '➕ Yeni Ürün Ekle' : '✏️ Ürünü Düzenle'}
            </Typography>
            <IconButton size="small" onClick={closeDialog} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' } }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: '20px !important' }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2.5}>
              <TextField
                fullWidth label="Ürün Adı *" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth label="Fiyat (₺) *" type="number" value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth label="Stok Adedi *" type="number" value={form.stock}
                    onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                    inputProps={{ min: 0 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
              <FormControl fullWidth>
                <InputLabel>Kategori *</InputLabel>
                <Select
                  value={form.category} label="Kategori *"
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  sx={{ borderRadius: 2 }}
                >
                  {CATEGORIES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth label="Birim" value={form.unit}
                onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="örn: kg, adet, litre"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                fullWidth label="Görsel URL" value={form.image_url}
                onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                placeholder="https://…"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              {form.image_url && (
                <Box
                  component="img"
                  src={form.image_url}
                  sx={{ height: 130, objectFit: 'cover', borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2.5, fontWeight: 600 }}>
              İptal
            </Button>
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              disabled={isMutating}
              sx={{
                borderRadius: 2.5, fontWeight: 700, px: 3,
                background: productDialog.mode === 'add'
                  ? 'linear-gradient(135deg,#6366F1,#8B5CF6)'
                  : 'linear-gradient(135deg,#10B981,#0D9488)',
              }}
            >
              {isMutating
                ? <CircularProgress size={20} color="inherit" />
                : productDialog.mode === 'add' ? 'Ekle' : 'Güncelle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Silme Onay Dialog ── */}
        <Dialog
          open={Boolean(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          PaperProps={{ sx: { borderRadius: 4 } }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
            <Avatar sx={{ bgcolor: alpha('#EF4444', 0.12), width: 40, height: 40 }}>
              <DeleteIcon sx={{ color: '#EF4444', fontSize: 20 }} />
            </Avatar>
            <Typography variant="h6" fontWeight={700}>Ürünü Sil</Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              <strong style={{ color: 'inherit' }}>{deleteConfirm?.name}</strong> ürününü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={() => setDeleteConfirm(null)} variant="outlined" sx={{ borderRadius: 2.5 }}>
              İptal
            </Button>
            <Button
              onClick={() => deleteConfirm && deleteProduct.mutate(deleteConfirm._id)}
              variant="contained"
              color="error"
              disabled={deleteProduct.isLoading}
              sx={{ borderRadius: 2.5, fontWeight: 700 }}
            >
              {deleteProduct.isLoading ? <CircularProgress size={18} color="inherit" /> : 'Sili Onayla'}
            </Button>
          </DialogActions>
        </Dialog>

      </MainLayout>
    </AuthGuard>
  )
}
