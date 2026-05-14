'use client'

import {
  Box, Typography, IconButton, CircularProgress, Alert, Chip,
  Avatar, Stack, Divider, Tooltip,
} from '@mui/material'
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'

// Kategori → emoji eşlemesi
const CATEGORY_EMOJI: Record<string, string> = {
  meyve_sebze: '🥦',
  et_tavuk:    '🥩',
  sut:         '🥛',
  firin:       '🍞',
  icecek:      '🧃',
  dondurulmus: '🧊',
}

interface StockItem {
  product_id: string
  name: string
  quantity: number
  unit?: string
  category?: string
  image_url?: string
}

/** Kullanıcının kişisel stoğunu listeleyen ve miktarını güncelleyen bileşen */
export default function StockOverview() {
  const queryClient = useQueryClient()
  const auth = getAuth(app)

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
      const item = stockItems.find((s) => s.product_id === productId)
      if (!item) return
      const newQty = item.quantity + change

      if (newQty <= 0) {
        // Miktar 0 veya altına düşerse ürünü stoktaın tamamen sil
        await axios.delete(`/api/auth/users/${uid}/stock/${productId}`, {
          headers: { Authorization },
        })
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Stok verileri yüklenemedi. Lütfen tekrar deneyin.
      </Alert>
    )
  }

  if (stockItems.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography fontSize={48} sx={{ mb: 1.5 }}>📦</Typography>
        <Typography variant="h6" fontWeight={600} gutterBottom>Stoğunuz boş</Typography>
        <Typography variant="body2" color="text.secondary">
          Sipariş verdiğinizde ürünler burada görünecek.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Mevcut Stok ({stockItems.length} ürün)
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {stockItems.map((item, index) => (
          <Box key={item.product_id}>
            {index > 0 && <Divider />}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 1.75,
                gap: 1.5,
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'action.hover', borderRadius: 2 },
                px: 1,
              }}
            >
              {/* Ürün görseli */}
              <Avatar
                variant="rounded"
                src={item.image_url || ''}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  bgcolor: 'action.selected',
                  flexShrink: 0,
                  fontSize: 24,
                }}
                imgProps={{
                  onError: (e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  },
                }}
              >
                {/* Görsel yoksa kategori emojisi göster */}
                {CATEGORY_EMOJI[item.category ?? ''] ?? '🛒'}
              </Avatar>

              {/* İsim + kategori */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" fontWeight={700} noWrap>
                  {item.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.category
                    ? `${CATEGORY_EMOJI[item.category] ?? ''} ${item.category}`
                    : ''}
                  {item.unit ? ` · ${item.unit}` : ''}
                </Typography>
              </Box>

              {/* Miktar kontrol */}
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Tooltip title={item.quantity <= 1 ? 'Stokttan Kaldır' : 'Azalt'}>
                  <IconButton
                    size="small"
                    onClick={() => updateMutation.mutate({ productId: item.product_id, change: -1 })}
                    disabled={updateMutation.isLoading}
                    sx={{
                      border: '1px solid',
                      borderColor: item.quantity <= 1 ? 'error.main' : 'divider',
                      borderRadius: 1.5,
                      width: 30,
                      height: 30,
                      color: item.quantity <= 1 ? 'error.main' : 'inherit',
                      '&:hover': item.quantity <= 1
                        ? { bgcolor: 'error.main', color: 'white', borderColor: 'error.main' }
                        : {},
                    }}
                  >
                    {item.quantity <= 1
                      ? <DeleteIcon sx={{ fontSize: 15 }} />
                      : <RemoveIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </Tooltip>

                <Chip
                  label={item.quantity}
                  size="small"
                  sx={{
                    minWidth: 40,
                    fontWeight: 800,
                    fontSize: 13,
                    background: item.quantity <= 1
                      ? 'linear-gradient(135deg,#EF4444,#DC2626)'
                      : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                    color: 'white',
                    border: 'none',
                  }}
                />

                <Tooltip title="Artır">
                  <IconButton
                    size="small"
                    onClick={() => updateMutation.mutate({ productId: item.product_id, change: 1 })}
                    disabled={updateMutation.isLoading}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, width: 30, height: 30 }}
                  >
                    <AddIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
