'use client'

import { useMemo } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  Button,
  Avatar,
  Chip,
  Stack,
  Skeleton,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  Inventory as StockIcon,
  Restaurant as RecipeIcon,
  Analytics as NutritionIcon,
  ShoppingBag as ShoppingIcon,
  ArrowForward as ArrowIcon,
  TrendingUp as TrendingIcon,
  LocalOffer as OfferIcon,
  Category as CategoryIcon,
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
import { ORDER_RULES } from '@/lib/orderRules'

interface StockOverviewApi {
  total_product_kinds: number
  total_units: number
  item_names: string[]
}

async function fetchStockOverview(): Promise<StockOverviewApi> {
  const auth = getAuth(app)
  const token = await auth.currentUser?.getIdToken()
  const { data } = await axios.get<StockOverviewApi>('/api/nutrition/stock-overview', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return data
}

/** Modern hero + feature cards dashboard */
export default function HomePage() {
  const theme = useTheme()
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0] || 'Kullanıcı'

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['nutrition-stock-overview'],
    queryFn: fetchStockOverview,
    staleTime: 60_000,
    retry: 1,
  })

  const { data: productCount, isLoading: productsLoading } = useQuery({
    queryKey: ['products-count'],
    queryFn: async () => {
      const { data } = await axios.get<unknown[]>('/api/products/')
      return Array.isArray(data) ? data.length : 0
    },
    staleTime: 120_000,
    retry: 1,
  })

  const featureCards = useMemo(
    () => [
      {
        title: 'Stok Yönetimi',
        description: 'Ürünlerinizin stok durumunu takip edin, tükenmeden önce haberdar olun.',
        icon: <StockIcon sx={{ fontSize: 28 }} />,
        href: '/stock',
        gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
        lightBg: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main,
      },
      {
        title: 'AI Tarif Önerileri',
        description: 'Stoğunuzdaki malzemelere göre kişiselleştirilmiş tarif önerileri alın.',
        icon: <RecipeIcon sx={{ fontSize: 28 }} />,
        href: '/recipes',
        gradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.error.main} 100%)`,
        lightBg: alpha(theme.palette.warning.main, 0.1),
        color: theme.palette.warning.main,
      },
      {
        title: 'Beslenme Analizi',
        description: 'Günlük besin alımınızı analiz edin, eksikliklerinizi tespit edin.',
        icon: <NutritionIcon sx={{ fontSize: 28 }} />,
        href: '/nutrition',
        gradient: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
        lightBg: alpha(theme.palette.success.main, 0.1),
        color: theme.palette.success.main,
      },
      {
        title: 'Ürünler',
        description: 'Binlerce ürün arasından arama yapın, sepetinize ekleyin.',
        icon: <ShoppingIcon sx={{ fontSize: 28 }} />,
        href: '/products',
        gradient: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.primary.main} 100%)`,
        lightBg: alpha(theme.palette.info.main, 0.1),
        color: theme.palette.info.main,
      },
    ],
    [theme]
  )

  const stats = useMemo(() => {
    const kinds = overview?.total_product_kinds ?? null
    const units = overview?.total_units != null ? overview.total_units.toFixed(1) : null
    const catCount = productCount != null ? String(productCount) : null
    return [
      {
        label: 'Stok çeşidi',
        value: kinds != null ? String(kinds) : '—',
        icon: <CategoryIcon fontSize="small" />,
        color: theme.palette.primary.main,
        loading: overviewLoading,
      },
      {
        label: 'Stok birimi',
        value: units != null ? units : '—',
        icon: <TrendingIcon fontSize="small" />,
        color: theme.palette.success.main,
        loading: overviewLoading,
      },
      {
        label: 'Katalog ürün',
        value: catCount != null ? catCount : '—',
        icon: <ShoppingIcon fontSize="small" />,
        color: theme.palette.info.main,
        loading: productsLoading,
      },
      {
        label: `Ücretsiz kargo (>${ORDER_RULES.FREE_SHIPPING_THRESHOLD_TL} ₺)`,
        value: `${ORDER_RULES.STANDARD_SHIPPING_FEE_TL} ₺`,
        icon: <OfferIcon fontSize="small" />,
        color: theme.palette.warning.main,
        loading: false,
      },
    ]
  }, [overview, productCount, overviewLoading, productsLoading, theme])

  const heroGradient = `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 55%, ${theme.palette.success.dark} 100%)`

  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="xl" sx={{ pb: 6 }}>
          <Box
            sx={{
              borderRadius: 4,
              background: heroGradient,
              p: { xs: 3, sm: 5 },
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: alpha(theme.palette.common.white, 0.06),
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -40,
                right: '25%',
                width: 150,
                height: 150,
                borderRadius: '50%',
                background: alpha(theme.palette.common.white, 0.04),
              }}
            />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                label="AI Destekli"
                size="small"
                sx={{ bgcolor: alpha(theme.palette.common.white, 0.2), color: 'white', fontWeight: 700, mb: 2 }}
              />
              <Typography variant="h3" fontWeight={800} color="white" gutterBottom>
                Hoş geldin, {firstName}!
              </Typography>
              <Typography variant="body1" sx={{ color: alpha(theme.palette.common.white, 0.85), maxWidth: 520, mb: 3 }}>
                Yapay zeka destekli alışveriş asistanın hazır. Stoğunu yönet, tarif önerileri al ve beslenme analizini görüntüle.
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  component={Link}
                  href="/products"
                  endIcon={<ArrowIcon />}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2.5,
                    px: 2.5,
                    py: 1.25,
                    ...(theme.palette.mode === 'dark'
                      ? {
                          bgcolor: alpha(theme.palette.common.white, 0.12),
                          color: theme.palette.common.white,
                          border: `1px solid ${alpha(theme.palette.common.white, 0.35)}`,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.common.white, 0.2),
                          },
                        }
                      : {
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          '&:hover': {
                            bgcolor: theme.palette.primary.dark,
                          },
                        }),
                  }}
                >
                  Alışverişe Başla
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  href="/recipes"
                  sx={{
                    borderRadius: 2.5,
                    ...(theme.palette.mode === 'dark'
                      ? {
                          borderColor: alpha(theme.palette.common.white, 0.55),
                          color: theme.palette.common.white,
                          '&:hover': {
                            borderColor: theme.palette.common.white,
                            bgcolor: alpha(theme.palette.common.white, 0.08),
                          },
                        }
                      : {
                          borderColor: alpha(theme.palette.primary.dark, 0.45),
                          color: theme.palette.primary.dark,
                          bgcolor: alpha(theme.palette.common.white, 0.95),
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            bgcolor: theme.palette.common.white,
                          },
                        }),
                  }}
                >
                  Tarif Al
                </Button>
              </Stack>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            {stats.map((stat) => (
              <Grid item xs={6} sm={3} key={stat.label}>
                <Card
                  elevation={0}
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                      '&:hover': { transform: 'none' },
                    },
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                >
                  <Avatar sx={{ bgcolor: alpha(stat.color, 0.12), color: stat.color, mx: 'auto', mb: 1, width: 40, height: 40 }}>
                    {stat.icon}
                  </Avatar>
                  {stat.loading ? (
                    <Skeleton variant="text" width="60%" sx={{ mx: 'auto', mb: 0.5 }} />
                  ) : (
                    <Typography variant="h5" fontWeight={800}>
                      {stat.value}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h5" fontWeight={700} sx={{ mb: 2.5 }}>
            Neler Yapabilirsiniz?
          </Typography>
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {featureCards.map((card) => (
              <Grid item xs={12} sm={6} lg={3} key={card.title}>
                <Card
                  component={Link}
                  href={card.href}
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    '@media (prefers-reduced-motion: reduce)': {
                      transition: 'none',
                      '&:hover': { transform: 'none' },
                    },
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[6],
                      borderColor: alpha(card.color, 0.35),
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      background: card.gradient,
                      mb: 2,
                      boxShadow: `0 4px 12px ${alpha(card.color, 0.25)}`,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    {card.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: card.color, gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={700} fontSize={13}>
                      Keşfet
                    </Typography>
                    <ArrowIcon sx={{ fontSize: 16 }} />
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Typography variant="h5" fontWeight={700} sx={{ mb: 2.5 }}>
            Stok Durumu
          </Typography>
          <Card elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <StockOverview />
          </Card>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
