'use client'

import { useState, useMemo } from 'react'
import {
  Box, Typography, IconButton, CircularProgress, Alert, Chip,
  Avatar, Stack, Divider, Tooltip, TextField, InputAdornment,
  Card, Badge, Skeleton, alpha, useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Inventory2 as BoxIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  meyve_sebze: { emoji: '🥦', label: 'Meyve & Sebze', color: '#10B981' },
  et_tavuk:    { emoji: '🥩', label: 'Et & Tavuk',    color: '#EF4444' },
  sut:         { emoji: '🥛', label: 'Süt Ürünleri',  color: '#3B82F6' },
  firin:       { emoji: '🍞', label: 'Fırın',          color: '#F59E0B' },
  icecek:      { emoji: '🧃', label: 'İçecek',         color: '#8B5CF6' },
  dondurulmus: { emoji: '🧊', label: 'Dondurulmuş',   color: '#06B6D4' },
}

interface StockItem {
  product_id: string
  name: string
  quantity: number
  unit?: string
  category?: string
  image_url?: string
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function StockSkeleton() {
  return (
    <Stack spacing={2}>
      {[1, 2, 3, 4].map(i => (
        <Card key={i} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Skeleton variant="rounded" width={52} height={52} sx={{ borderRadius: 2, flexShrink: 0 }} />
            <Box flex={1}>
              <Skeleton variant="text" width="55%" height={22} />
              <Skeleton variant="text" width="35%" height={18} />
            </Box>
            <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 2 }} />
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}

// ─── StockOverview ────────────────────────────────────────────────────────────

export default function StockOverview() {
  const theme = useTheme()
  const queryClient = useQueryClient()
  const auth = getAuth(app)
  const isDark = theme.palette.mode === 'dark'
  const [search, setSearch] = useState('')

  const getAuthHeaders = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('Oturum açılmamış')
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}`, uid: user.uid }
  }

  const { data: stockItems = [], isLoading, error } = useQuery<StockItem[]>(
    'stock',
    async () => {
      const { Authorization, uid } = await getAuthHeaders()
      const res = await axios.get(`/api/auth/users/${uid}/stock`, { headers: { Authorization } })
      return res.data
    },
    { retry: false }
  )

  const updateMutation = useMutation(
    async ({ productId, change }: { productId: string; change: number }) => {
      const { Authorization, uid } = await getAuthHeaders()
      const item = stockItems.find(s => s.product_id === productId)
      if (!item) return
      const newQty = item.quantity + change
      if (newQty <= 0) {
        await axios.delete(`/api/auth/users/${uid}/stock/${productId}`, { headers: { Authorization } })
      } else {
        await axios.put(
          `/api/auth/users/${uid}/stock/${productId}`,
          null,
          { headers: { Authorization }, params: { quantity: newQty } }
        )
      }
    },
    { onSuccess: () => queryClient.invalidateQueries('stock') }
  )

  // ── Stats ──
  const totalKinds = stockItems.length
  const totalUnits = stockItems.reduce((s, i) => s + i.quantity, 0)
  const lowStockItems = stockItems.filter(i => i.quantity <= 2)

  // ── Filtered + grouped ──
  const filtered = useMemo(() =>
    search.trim()
      ? stockItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : stockItems
  , [stockItems, search])

  const grouped = useMemo(() => {
    const map: Record<string, StockItem[]> = {}
    for (const item of filtered) {
      const cat = item.category ?? 'diger'
      if (!map[cat]) map[cat] = []
      map[cat].push(item)
    }
    return map
  }, [filtered])

  // ── Error ──
  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2.5 }}>
        Stok verileri yüklenemedi. Lütfen sayfayı yenileyin.
      </Alert>
    )
  }

  // ── Loading ──
  if (isLoading) return <StockSkeleton />

  // ── Empty ──
  if (stockItems.length === 0) {
    return (
      <Card
        elevation={0}
        sx={{
          p: { xs: 5, md: 8 },
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 4,
          background: alpha(theme.palette.primary.main, 0.03),
        }}
      >
        <Typography fontSize={56} sx={{ mb: 2 }}>📦</Typography>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Stoğunuz boş
        </Typography>
        <Typography variant="body2" color="text.secondary" maxWidth={320} mx="auto">
          Sipariş verdiğinizde veya tarif yaptığınızda ürünler burada otomatik görünecek.
        </Typography>
      </Card>
    )
  }

  return (
    <Box>
      {/* ── Stats row ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        {[
          { label: 'Çeşit', value: totalKinds, color: '#6366F1', emoji: '🗂️' },
          { label: 'Toplam Birim', value: totalUnits.toFixed(0), color: '#10B981', emoji: '📊' },
          { label: 'Az Kalan', value: lowStockItems.length, color: lowStockItems.length > 0 ? '#EF4444' : '#10B981', emoji: lowStockItems.length > 0 ? '⚠️' : '✅' },
        ].map(stat => (
          <Card
            key={stat.label}
            elevation={0}
            sx={{
              flex: 1,
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              transition: 'transform 0.15s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[2] },
            }}
          >
            <Avatar sx={{ bgcolor: alpha(stat.color, 0.12), width: 44, height: 44, fontSize: 22 }}>
              {stat.emoji}
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800} lineHeight={1} sx={{ color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {stat.label}
              </Typography>
            </Box>
          </Card>
        ))}
      </Stack>

      {/* ── Low stock panel ── */}
      {lowStockItems.length > 0 && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            bgcolor: alpha('#EF4444', isDark ? 0.08 : 0.05),
            border: `1px solid ${alpha('#EF4444', 0.25)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
            <Box
              sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0,
                animation: 'lowPulse 2s ease-in-out infinite',
                '@keyframes lowPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.45 } },
              }}
            />
            <Typography variant="caption" fontWeight={800} color="error.main" textTransform="uppercase" letterSpacing={0.8}>
              Az Kalan — {lowStockItems.length} ürün
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {lowStockItems.map(item => {
              const meta = CATEGORY_META[item.category ?? '']
              return (
                <Box
                  key={item.product_id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    px: 1.5, py: 0.75, borderRadius: 2,
                    bgcolor: alpha('#EF4444', isDark ? 0.15 : 0.08),
                    border: `1px solid ${alpha('#EF4444', 0.3)}`,
                  }}
                >
                  <Typography fontSize={14}>{meta?.emoji ?? '🛒'}</Typography>
                  <Typography variant="body2" fontWeight={700} color="error.main" noWrap>
                    {item.name}
                  </Typography>
                  <Chip
                    label={`${item.quantity} adet`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 800, bgcolor: '#EF4444', color: 'white', border: 'none' }}
                  />
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}

      {/* ── Search ── */}
      <TextField
        fullWidth
        size="small"
        placeholder="Ürün ara…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            </InputAdornment>
          ),
        }}
      />

      {/* ── No results ── */}
      {filtered.length === 0 && (
        <Box textAlign="center" py={5}>
          <Typography fontSize={40} mb={1}>🔍</Typography>
          <Typography variant="body1" color="text.secondary">
            "{search}" için sonuç bulunamadı.
          </Typography>
        </Box>
      )}

      {/* ── Category grouped list ── */}
      <Stack spacing={3}>
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = CATEGORY_META[cat]
          return (
            <Box key={cat}>
              {/* Category header */}
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <Typography fontSize={18}>{meta?.emoji ?? '🛒'}</Typography>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.7} fontSize="0.72rem">
                  {meta?.label ?? cat}
                </Typography>
                <Chip
                  label={items.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    bgcolor: alpha(meta?.color ?? '#6366F1', 0.12),
                    color: meta?.color ?? '#6366F1',
                  }}
                />
              </Stack>

              <Stack spacing={1.5}>
                {items.map(item => {
                  const isLow = item.quantity <= 2
                  const catColor = meta?.color ?? '#6366F1'
                  return (
                    <Card
                      key={item.product_id}
                      elevation={0}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: { xs: 1.5, sm: 2 },
                        border: `1px solid`,
                        borderColor: isLow ? alpha('#EF4444', 0.4) : 'divider',
                        borderRadius: 2.5,
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          borderColor: isLow ? '#EF4444' : catColor,
                          boxShadow: `0 4px 16px ${alpha(isLow ? '#EF4444' : catColor, 0.12)}`,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      {/* Image / emoji avatar */}
                      <Badge
                        badgeContent={isLow ? '!' : 0}
                        color="error"
                        sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 800, width: 18, height: 18, minWidth: 18 } }}
                      >
                        <Avatar
                          variant="rounded"
                          src={item.image_url || ''}
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            bgcolor: alpha(catColor, 0.1),
                            flexShrink: 0,
                            fontSize: 24,
                            border: `1px solid ${alpha(catColor, 0.2)}`,
                          }}
                          imgProps={{ onError: e => { (e.target as HTMLImageElement).style.display = 'none' } }}
                        >
                          {meta?.emoji ?? '🛒'}
                        </Avatar>
                      </Badge>

                      {/* Name + meta */}
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body1" fontWeight={700} noWrap>
                          {item.name}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
                          {item.unit && (
                            <Typography variant="caption" color="text.secondary">
                              {item.unit}
                            </Typography>
                          )}
                          {isLow && (
                            <Chip
                              label="Az kaldı"
                              size="small"
                              icon={<WarningIcon sx={{ fontSize: '12px !important' }} />}
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                bgcolor: alpha('#EF4444', 0.1),
                                color: '#EF4444',
                                '& .MuiChip-icon': { color: '#EF4444' },
                              }}
                            />
                          )}
                        </Stack>
                      </Box>

                      {/* Quantity stepper */}
                      <Stack direction="row" alignItems="center" spacing={0.75} flexShrink={0}>
                        <Tooltip title={item.quantity <= 1 ? 'Stokttan Kaldır' : 'Azalt'}>
                          <IconButton
                            size="small"
                            onClick={() => updateMutation.mutate({ productId: item.product_id, change: -1 })}
                            disabled={updateMutation.isLoading}
                            sx={{
                              border: '1px solid',
                              borderColor: item.quantity <= 1 ? 'error.main' : 'divider',
                              borderRadius: 1.5,
                              width: 30, height: 30,
                              color: item.quantity <= 1 ? 'error.main' : 'inherit',
                              transition: 'all 0.15s',
                              '&:hover:not(:disabled)': item.quantity <= 1
                                ? { bgcolor: 'error.main', color: 'white', borderColor: 'error.main' }
                                : { borderColor: catColor, color: catColor },
                            }}
                          >
                            {item.quantity <= 1
                              ? <DeleteIcon sx={{ fontSize: 14 }} />
                              : <RemoveIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                        </Tooltip>

                        <Chip
                          label={item.quantity}
                          sx={{
                            minWidth: 42,
                            fontWeight: 800,
                            fontSize: 14,
                            background: isLow
                              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                              : `linear-gradient(135deg, ${catColor}, ${catColor}cc)`,
                            color: 'white',
                            border: 'none',
                            height: 30,
                          }}
                        />

                        <Tooltip title="Artır">
                          <IconButton
                            size="small"
                            onClick={() => updateMutation.mutate({ productId: item.product_id, change: 1 })}
                            disabled={updateMutation.isLoading}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              width: 30, height: 30,
                              transition: 'all 0.15s',
                              '&:hover:not(:disabled)': { borderColor: catColor, color: catColor },
                            }}
                          >
                            <AddIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Card>
                  )
                })}
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )
}
