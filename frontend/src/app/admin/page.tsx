'use client'

import React, { useState } from 'react'
import {
  Container, Box, Typography, Grid, Card, Tab, Tabs, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Tooltip, CircularProgress, Alert, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'
import {
  People as PeopleIcon, Inventory as ProductIcon, Add as AddIcon,
  Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  TrendingUp as RevenueIcon, ShoppingCart as OrderIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'

const CATEGORIES = [
  { label: 'Meyve & Sebze', value: 'meyve_sebze' },
  { label: 'Et & Tavuk', value: 'et_tavuk' },
  { label: 'Süt Ürünleri', value: 'sut' },
  { label: 'Fırın', value: 'firin' },
  { label: 'İçecek', value: 'icecek' },
  { label: 'Dondurulmuş', value: 'dondurulmus' },
]

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

/** Admin kontrol paneli */
export default function AdminPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)
  const [productDialog, setProductDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; product?: Product }>({ open: false, mode: 'add' })
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)

  // ── Veri sorguları ──
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

  // ── Ürün CRUD mutasyonları ──
  const createProduct = useMutation(
    async (data: typeof emptyForm) => {
      const headers = await getAuthHeader()
      return axios.post('/api/products/', {
        name: data.name,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        image_url: data.image_url,
        category: data.category,
        unit: data.unit,
      }, { headers })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-products')
        setProductDialog({ open: false, mode: 'add' })
        setForm(emptyForm)
      },
      onError: (err: any) => setFormError(err.response?.data?.detail || 'Ürün eklenemedi.'),
    }
  )

  const updateProduct = useMutation(
    async ({ id, data }: { id: string; data: typeof emptyForm }) => {
      const headers = await getAuthHeader()
      return axios.put(`/api/products/${id}`, {
        name: data.name,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        image_url: data.image_url,
        category: data.category,
        unit: data.unit,
      }, { headers })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-products')
        setProductDialog({ open: false, mode: 'add' })
        setForm(emptyForm)
      },
      onError: (err: any) => setFormError(err.response?.data?.detail || 'Ürün güncellenemedi.'),
    }
  )

  const deleteProduct = useMutation(
    async (id: string) => {
      const headers = await getAuthHeader()
      return axios.delete(`/api/products/${id}`, { headers })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-products')
        setDeleteConfirm(null)
      },
    }
  )

  const openAddDialog = () => {
    setForm(emptyForm)
    setFormError(null)
    setProductDialog({ open: false, mode: 'add' })
    setTimeout(() => setProductDialog({ open: true, mode: 'add' }), 0)
  }

  const openEditDialog = (product: Product) => {
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      image_url: product.image_url,
      category: product.category,
      unit: product.unit || 'adet',
    })
    setFormError(null)
    setProductDialog({ open: true, mode: 'edit', product })
  }

  const handleFormSubmit = () => {
    if (!form.name || !form.price || !form.stock || !form.category) {
      setFormError('Ad, fiyat, stok ve kategori zorunludur.')
      return
    }
    if (productDialog.mode === 'add') {
      createProduct.mutate(form)
    } else if (productDialog.product) {
      updateProduct.mutate({ id: productDialog.product._id, data: form })
    }
  }

  const statCards = [
    { label: 'Toplam Kullanıcı', value: stats?.total_users ?? '—', icon: <PeopleIcon />, color: '#6366F1' },
    { label: 'Toplam Ürün', value: (products.length || stats?.total_products) ?? '—', icon: <ProductIcon />, color: '#10B981' },
    { label: 'Toplam Sipariş', value: stats?.total_orders ?? '—', icon: <OrderIcon />, color: '#F59E0B' },
    { label: 'Toplam Gelir', value: stats?.total_revenue ? `₺${stats.total_revenue.toLocaleString('tr-TR')}` : '—', icon: <RevenueIcon />, color: '#3B82F6' },
  ]

  return (
    <AuthGuard adminOnly>
      <MainLayout>
        <Container maxWidth="xl" sx={{ pb: 6 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={800}>Admin Paneli</Typography>
            <Typography variant="body2" color="text.secondary">Kullanıcı ve ürün yönetimi</Typography>
          </Box>

          {/* İstatistik kartları */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {statCards.map((s) => (
              <Grid item xs={12} sm={6} lg={3} key={s.label}>
                <Card elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: s.color + '18', color: s.color, width: 48, height: 48 }}>
                    {s.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>{s.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Sekmeler */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab icon={<PeopleIcon fontSize="small" />} iconPosition="start" label="Kullanıcılar" />
              <Tab icon={<ProductIcon fontSize="small" />} iconPosition="start" label="Ürünler" />
            </Tabs>

            {/* ── Kullanıcılar ── */}
            {activeTab === 0 && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Tooltip title="Yenile">
                    <IconButton onClick={() => refetchUsers()} size="small">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {usersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Ad</TableCell>
                          <TableCell>E-posta</TableCell>
                          <TableCell>Rol</TableCell>
                          <TableCell>Telefon</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((u: any, i: number) => (
                          <TableRow key={i} hover>
                            <TableCell>{u.name} {u.surname}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={u.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                                size="small"
                                color={u.role === 'admin' ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell>{u.phone || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}

            {/* ── Ürünler ── */}
            {activeTab === 1 && (
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {products.length} ürün
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Yenile">
                      <IconButton onClick={() => refetchProducts()} size="small">
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={openAddDialog}
                      sx={{ borderRadius: 2 }}
                    >
                      Ürün Ekle
                    </Button>
                  </Stack>
                </Box>

                {productsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Görsel</TableCell>
                          <TableCell>Ürün Adı</TableCell>
                          <TableCell>Kategori</TableCell>
                          <TableCell align="right">Fiyat</TableCell>
                          <TableCell align="right">Stok</TableCell>
                          <TableCell align="center">İşlem</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product._id} hover>
                            <TableCell>
                              <Box
                                component="img"
                                src={product.image_url}
                                alt={product.name}
                                sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1.5 }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={CATEGORIES.find((c) => c.value === product.category)?.label || product.category}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700} color="primary">
                                {product.price.toFixed(2)} ₺
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={product.stock}
                                size="small"
                                color={product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'error'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Stack direction="row" justifyContent="center" spacing={0.5}>
                                <Tooltip title="Düzenle">
                                  <IconButton size="small" onClick={() => openEditDialog(product)} color="primary">
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Sil">
                                  <IconButton size="small" onClick={() => setDeleteConfirm(product)} color="error">
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
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
          onClose={() => setProductDialog((p) => ({ ...p, open: false }))}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle fontWeight={700}>
            {productDialog.mode === 'add' ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle'}
          </DialogTitle>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                fullWidth label="Ürün Adı" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth label="Fiyat (₺)" type="number" value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }} required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth label="Stok Adedi" type="number" value={form.stock}
                    onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                    inputProps={{ min: 0 }} required
                  />
                </Grid>
              </Grid>
              <FormControl fullWidth required>
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={form.category} label="Kategori"
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth label="Birim" value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                placeholder="örn: kg, adet, litre"
              />
              <TextField
                fullWidth label="Görsel URL" value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
              />
              {form.image_url && (
                <Box
                  component="img"
                  src={form.image_url}
                  sx={{ height: 120, objectFit: 'cover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button
              onClick={() => setProductDialog((p) => ({ ...p, open: false }))}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              İptal
            </Button>
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              sx={{ borderRadius: 2 }}
              disabled={createProduct.isLoading || updateProduct.isLoading}
            >
              {(createProduct.isLoading || updateProduct.isLoading)
                ? <CircularProgress size={20} color="inherit" />
                : productDialog.mode === 'add' ? 'Ekle' : 'Güncelle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Silme Onay Dialog ── */}
        <Dialog
          open={Boolean(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle fontWeight={700}>Ürünü Sil</DialogTitle>
          <DialogContent>
            <Typography>
              <strong>{deleteConfirm?.name}</strong> ürününü silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setDeleteConfirm(null)} variant="outlined" sx={{ borderRadius: 2 }}>
              İptal
            </Button>
            <Button
              onClick={() => deleteConfirm && deleteProduct.mutate(deleteConfirm._id)}
              variant="contained"
              color="error"
              sx={{ borderRadius: 2 }}
              disabled={deleteProduct.isLoading}
            >
              {deleteProduct.isLoading ? <CircularProgress size={18} color="inherit" /> : 'Sil'}
            </Button>
          </DialogActions>
        </Dialog>
      </MainLayout>
    </AuthGuard>
  )
}
