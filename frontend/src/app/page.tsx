'use client'

import { useMemo } from 'react'
import {
  Box, Container, Typography, Grid, Card, Button, Avatar, Chip,
  Stack, Skeleton, useTheme, Divider,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  Inventory as StockIcon,
  Restaurant as RecipeIcon,
  Analytics as NutritionIcon,
  ShoppingBag as ShoppingIcon,
  ArrowForward as ArrowIcon,
  ShoppingCart as CartIcon,
  LocalShipping as OrderIcon,
  Person as PersonIcon,
  EmojiEvents as DietIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useQuery } from 'react-query'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import StockOverview from '@/components/StockOverview'

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserOrder {
  order_id: string
  total_price: number
  status: string
  created_at: string
  items: { name: string; quantity: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours()
  if (h < 12) return `Günaydın, ${name}!`
  if (h < 18) return `İyi günler, ${name}!`
  return `İyi akşamlar, ${name}!`
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Beklemede',      color: '#F59E0B' },
  processing: { label: 'Hazırlanıyor',   color: '#6366F1' },
  shipped:    { label: 'Kargoda',        color: '#3B82F6' },
  delivered:  { label: 'Teslim Edildi',  color: '#10B981' },
  cancelled:  { label: 'İptal',          color: '#EF4444' },
}

async function getAuthToken() {
  const token = await getAuth(app).currentUser?.getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const theme = useTheme()
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0] || 'Kullanıcı'
  const isDark = theme.palette.mode === 'dark'

  const { data: orders = [], isLoading: ordersLoading } = useQuery<UserOrder[]>(
    'user-recent-orders',
    async () => {
      const headers = await getAuthToken()
      const res = await axios.get('/api/auth/orders', { headers })
      const data = res.data
      const list: UserOrder[] = Array.isArray(data) ? data : Object.values(data || {})
      return list
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
    },
    { enabled: !!user, staleTime: 30_000, retry: 1, refetchInterval: 30_000 }
  )

  const quickActions = useMemo(() => [
    {
      label: 'Alışveriş Yap',
      href: '/products',
      icon: <CartIcon />,
      gradient: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
      color: '#6366F1',
    },
    {
      label: 'Stok Ekle',
      href: '/stock',
      icon: <StockIcon />,
      gradient: 'linear-gradient(135deg,#10B981,#0D9488)',
      color: '#10B981',
    },
    {
      label: 'Tarif Bul',
      href: '/recipes',
      icon: <RecipeIcon />,
      gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
      color: '#F59E0B',
    },
    {
      label: 'Profilim',
      href: '/profile',
      icon: <PersonIcon />,
      gradient: 'linear-gradient(135deg,#3B82F6,#6366F1)',
      color: '#3B82F6',
    },
  ], [])

  const featureCards = useMemo(() => [
    {
      title: 'Stok Yönetimi',
      description: 'Ürünlerinizi takip edin, tükenmeden önce haberdar olun.',
      icon: <StockIcon sx={{ fontSize: 26 }} />,
      href: '/stock',
      gradient: `linear-gradient(135deg,#6366F1,#8B5CF6)`,
      color: '#6366F1',
    },
    {
      title: 'AI Tarif Önerileri',
      description: 'Stoğunuza göre kişiselleştirilmiş tarifler alın.',
      icon: <RecipeIcon sx={{ fontSize: 26 }} />,
      href: '/recipes',
      gradient: `linear-gradient(135deg,#F59E0B,#EF4444)`,
      color: '#F59E0B',
    },
    {
      title: 'Beslenme Analizi',
      description: 'Günlük besin alımınızı analiz edin.',
      icon: <NutritionIcon sx={{ fontSize: 26 }} />,
      href: '/nutrition',
      gradient: `linear-gradient(135deg,#10B981,#0D9488)`,
      color: '#10B981',
    },
    {
      title: 'Ürünler',
      description: 'Binlerce ürün arasından arama yapın.',
      icon: <ShoppingIcon sx={{ fontSize: 26 }} />,
      href: '/products',
      gradient: `linear-gradient(135deg,#3B82F6,#6366F1)`,
      color: '#3B82F6',
    },
    {
      title: 'Diyet Tercihlerim',
      description: 'Beslenme alışkanlıklarınızı kaydedin.',
      icon: <DietIcon sx={{ fontSize: 26 }} />,
      href: '/preferences',
      gradient: `linear-gradient(135deg,#EC4899,#8B5CF6)`,
      color: '#EC4899',
    },
  ], [])

  return (
    <AuthGuard userOnly>
      <MainLayout>
        <Container maxWidth="xl" sx={{ pb: 6 }}>

          {/* ── Hero ── */}
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
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -30, right: '20%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                label="AI Destekli"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, mb: 1.5, fontSize: '0.72rem' }}
              />
              <Typography variant="h4" fontWeight={800} color="white" gutterBottom>
                {getGreeting(firstName)}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.78)', maxWidth: 480, mb: 2.5 }}>
                Yapay zeka destekli alışveriş asistanın hazır. Ne yapmak istersin?
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button
                  variant="contained"
                  component={Link}
                  href="/products"
                  endIcon={<ArrowIcon />}
                  sx={{
                    fontWeight: 700, borderRadius: 2.5, px: 2.5, py: 1.1,
                    bgcolor: 'rgba(255,255,255,0.15)', color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  Alışverişe Başla
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  href="/profile"
                  endIcon={<OrderIcon />}
                  sx={{
                    fontWeight: 700, borderRadius: 2.5, px: 2.5, py: 1.1,
                    borderColor: 'rgba(255,255,255,0.4)', color: 'white',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  Siparişlerim
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* ── Quick Actions ── */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {quickActions.map((action) => (
              <Grid item xs={6} sm={3} key={action.href}>
                <Card
                  component={Link}
                  href={action.href}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 6px 20px ${alpha(action.color, 0.2)}`,
                      borderColor: alpha(action.color, 0.35),
                    },
                  }}
                >
                  <Avatar sx={{ background: action.gradient, width: 46, height: 46 }}>
                    {action.icon}
                  </Avatar>
                  <Typography variant="body2" fontWeight={700} textAlign="center">
                    {action.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* ── Recent Orders ── */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={700}>Son Siparişlerim</Typography>
              <Button
                component={Link}
                href="/profile"
                size="small"
                endIcon={<ArrowIcon sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 600, fontSize: 13 }}
              >
                Tümünü Gör
              </Button>
            </Stack>

            {ordersLoading ? (
              <Stack spacing={1.5}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={70} sx={{ borderRadius: 3 }} />
                ))}
              </Stack>
            ) : orders.length === 0 ? (
              <Card
                elevation={0}
                sx={{
                  p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3,
                  textAlign: 'center',
                  background: isDark ? alpha('#6366F1', 0.05) : alpha('#6366F1', 0.03),
                }}
              >
                <Typography fontSize={36} mb={1}>🛒</Typography>
                <Typography variant="body1" fontWeight={600} gutterBottom>Henüz sipariş vermediniz</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  İlk siparişinizi verin, burada takip edin.
                </Typography>
                <Button
                  variant="contained"
                  component={Link}
                  href="/products"
                  sx={{ borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                >
                  Alışverişe Başla
                </Button>
              </Card>
            ) : (
              <Stack spacing={1.5}>
                {orders.map((order) => {
                  const sc = STATUS_MAP[order.status] ?? { label: order.status, color: '#6366F1' }
                  const dateStr = order.created_at
                    ? new Date(order.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'
                  const itemSummary = order.items?.slice(0, 2).map(i => i.name).join(', ') + (order.items?.length > 2 ? ` +${order.items.length - 2}` : '')
                  return (
                    <Card
                      key={order.order_id}
                      elevation={0}
                      sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: alpha(sc.color, 0.12), color: sc.color, width: 40, height: 40 }}>
                            <OrderIcon fontSize="small" />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                              #{order.order_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 240, display: 'block' }}>
                              {itemSummary || '—'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack alignItems="flex-end" spacing={0.5}>
                          <Chip
                            label={sc.label}
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: alpha(sc.color, 0.12), color: sc.color }}
                          />
                          <Typography variant="caption" color="text.secondary">{dateStr}</Typography>
                        </Stack>
                      </Stack>
                      {order.total_price != null && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" fontWeight={800} color="primary">
                            ₺{Number(order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </>
                      )}
                    </Card>
                  )
                })}
              </Stack>
            )}
          </Box>

          {/* ── Feature Cards ── */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Neler Yapabilirsiniz?</Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {featureCards.map((card) => (
              <Grid item xs={12} sm={6} lg={4} key={card.title}>
                <Card
                  component={Link}
                  href={card.href}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 20px ${alpha(card.color, 0.18)}`,
                      borderColor: alpha(card.color, 0.3),
                    },
                  }}
                >
                  <Avatar sx={{ background: card.gradient, width: 46, height: 46, flexShrink: 0 }}>
                    {card.icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={700}>{card.title}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{card.description}</Typography>
                  </Box>
                  <ArrowIcon sx={{ fontSize: 18, color: card.color, flexShrink: 0 }} />
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* ── Stock Overview ── */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Stok Durumu</Typography>
          <Card elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <StockOverview />
          </Card>

        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
