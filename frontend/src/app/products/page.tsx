'use client'

import React, { useState, useEffect } from 'react'
import {
  Container, Box, Typography, Grid, Card, CardMedia, CardContent,
  CardActions, Button, TextField, InputAdornment, Chip, Stack, Rating,
  Skeleton, Alert, Pagination, Badge, Avatar, Fab, Zoom, IconButton, Tooltip,
} from '@mui/material'
import {
  Search as SearchIcon, AddShoppingCart as CartAddIcon,
  ShoppingCart as CartIcon, CheckCircle as CheckIcon,
  Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon,
  OpenInNew as DetailIcon,
} from '@mui/icons-material'
import { useQuery } from 'react-query'
import axios from 'axios'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'
import { useFavorites } from '@/context/FavoritesContext'

interface Product {
  _id: string
  name: string
  price: number
  stock: number
  image_url: string
  category: string
  unit?: string
  avg_rating: number
  review_count: number
}

interface PaginatedProducts {
  items: Product[]
  total: number
  page: number
  pages: number
  limit: number
}

const CATEGORIES = [
  { label: 'Tümü', value: '', emoji: '🛒' },
  { label: 'Meyve & Sebze', value: 'meyve_sebze', emoji: '🥦' },
  { label: 'Et & Tavuk', value: 'et_tavuk', emoji: '🥩' },
  { label: 'Süt Ürünleri', value: 'sut', emoji: '🥛' },
  { label: 'Fırın', value: 'firin', emoji: '🍞' },
  { label: 'İçecek', value: 'icecek', emoji: '🧃' },
  { label: 'Dondurulmuş', value: 'dondurulmus', emoji: '🧊' },
]

const ITEMS_PER_PAGE = 12

export default function ProductsPage() {
  const { addItem, totalCount, items } = useCart()
  const toast = useToast()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({})
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowFab(window.scrollY > 200)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Debounce search → reset page to 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError, error } = useQuery<PaginatedProducts>(
    ['products', category, debouncedSearch, page],
    async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', ITEMS_PER_PAGE.toString())
      if (category) params.set('category', category)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const res = await axios.get(`/api/products/?${params.toString()}`)
      return res.data
    },
    { keepPreviousData: true },
  )

  const products = data?.items ?? []
  const pageCount = data?.pages ?? 1
  const totalProducts = data?.total ?? 0

  const getCartQty = (id: string) => items.find((i) => i.id === id)?.quantity || 0

  const handleAddToCart = (product: Product) => {
    const currentQty = getCartQty(product._id)
    if (currentQty >= product.stock) {
      toast.warning(`"${product.name}" için maksimum stok adedine ulaştınız (${product.stock} adet).`)
      return
    }
    addItem({
      id: product._id, name: product.name, price: product.price,
      image_url: product.image_url, category: product.category,
      unit: product.unit, stock: product.stock,
    })
    setJustAdded((prev) => ({ ...prev, [product._id]: true }))
    setTimeout(() => setJustAdded((prev) => ({ ...prev, [product._id]: false })), 1200)
  }

  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="xl" sx={{ pb: 10 }}>
          {/* Başlık */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>Ürünler</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {isLoading ? 'Yükleniyor…' : `${totalProducts} ürün listelendi`}
              </Typography>
            </Box>
            {totalCount > 0 && (
              <Button
                variant="contained"
                component={Link}
                href="/cart"
                startIcon={<Badge badgeContent={totalCount} color="error"><CartIcon /></Badge>}
                sx={{ borderRadius: 2.5 }}
              >
                Sepete Git
              </Button>
            )}
          </Box>

          {/* Arama */}
          <TextField
            fullWidth
            placeholder="Ürün ara… (örn: elma, süt)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2.5, maxWidth: 520 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Kategori chip'leri */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3.5 }}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.value
              return (
                <Chip
                  key={cat.value}
                  label={`${cat.emoji} ${cat.label}`}
                  onClick={() => { setCategory(cat.value); setPage(1) }}
                  sx={{
                    fontWeight: active ? 700 : 500,
                    background: active ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : undefined,
                    color: active ? 'white' : undefined,
                    border: active ? 'none' : '1px solid',
                    borderColor: active ? 'transparent' : 'divider',
                    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                    transition: 'all 0.2s',
                  }}
                />
              )
            })}
          </Stack>

          {isError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error instanceof Error ? error.message : 'Ürünler yüklenemedi. Lütfen tekrar deneyin.'}
            </Alert>
          )}

          {/* Ürün kartları */}
          <Grid container spacing={2.5}>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                    <Skeleton variant="rectangular" height={340} sx={{ borderRadius: 3 }} />
                  </Grid>
                ))
              : products.map((product) => {
                  const cartQty = getCartQty(product._id)
                  const added = justAdded[product._id]
                  const fav = isFavorite(product._id)
                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%', display: 'flex', flexDirection: 'column',
                          border: '1px solid',
                          borderColor: cartQty > 0 ? 'primary.main' : 'divider',
                          transition: 'all 0.25s ease', overflow: 'hidden',
                          '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 16px 40px rgba(0,0,0,0.12)', borderColor: 'primary.main' },
                        }}
                      >
                        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                          <CardMedia
                            component="img"
                            height="175"
                            image={product.image_url || `https://placehold.co/300x175/E8E8FF/6366F1?text=${encodeURIComponent(product.name)}`}
                            alt={product.name}
                            sx={{ objectFit: 'cover', transition: 'transform 0.3s', '.MuiCard-root:hover &': { transform: 'scale(1.05)' } }}
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/300x175/E8E8FF/6366F1?text=${encodeURIComponent(product.name)}` }}
                          />
                          {/* Stok etiketi */}
                          <Chip
                            label={product.stock === 0 ? 'Tükendi' : product.stock <= 5 ? `Son ${product.stock} adet!` : 'Stokta'}
                            size="small"
                            sx={{
                              position: 'absolute', top: 8, right: 8,
                              bgcolor: product.stock === 0 ? 'error.main' : product.stock <= 5 ? 'warning.main' : 'success.main',
                              color: 'white', fontWeight: 700, fontSize: 11,
                            }}
                          />
                          {/* Sepet adedi rozeti */}
                          {cartQty > 0 && (
                            <Avatar sx={{ position: 'absolute', top: 8, left: 8, width: 28, height: 28, fontSize: 13, fontWeight: 800, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 2px 8px rgba(99,102,241,0.5)' }}>
                              {cartQty}
                            </Avatar>
                          )}
                        </Box>

                        <CardContent sx={{ flex: 1, pb: 1 }}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap title={product.name}>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {CATEGORIES.find((c) => c.value === product.category)?.emoji}{' '}
                            {CATEGORIES.find((c) => c.value === product.category)?.label || product.category}
                          </Typography>
                          {product.avg_rating > 0 && (
                            <Stack direction="row" alignItems="center" spacing={0.5} mt={0.25}>
                              <Rating value={product.avg_rating} readOnly size="small" precision={0.5} />
                              <Typography variant="caption" color="text.secondary">({product.review_count})</Typography>
                            </Stack>
                          )}
                          <Typography variant="h6" fontWeight={800} color="primary" sx={{ mt: 0.25 }}>
                            {product.price.toFixed(2)} ₺
                            {product.unit && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>/ {product.unit}</Typography>
                            )}
                          </Typography>
                        </CardContent>

                        <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 0.5 }}>
                          <Button
                            variant={added ? 'outlined' : cartQty > 0 ? 'outlined' : 'contained'}
                            size="small"
                            startIcon={added ? <CheckIcon fontSize="small" /> : <CartAddIcon fontSize="small" />}
                            disabled={product.stock === 0}
                            onClick={() => handleAddToCart(product)}
                            sx={{ flex: 1, borderRadius: 2, py: 0.75, transition: 'all 0.15s', ...(added && { borderColor: 'success.main', color: 'success.main' }) }}
                          >
                            {added ? 'Eklendi!' : cartQty > 0 ? `Tekrar Ekle (${cartQty})` : 'Sepete Ekle'}
                          </Button>
                          <Tooltip title={fav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}>
                            <IconButton
                              size="small"
                              onClick={() => toggleFavorite({ id: product._id, name: product.name, price: product.price, image_url: product.image_url, category: product.category, stock: product.stock, unit: product.unit, avg_rating: product.avg_rating, review_count: product.review_count })}
                              sx={{ color: fav ? 'error.main' : 'text.disabled', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                            >
                              {fav ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ürün Detayı">
                            <IconButton size="small" component={Link} href={`/products/${product._id}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                              <DetailIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </CardActions>
                      </Card>
                    </Grid>
                  )
                })}
          </Grid>

          {!isLoading && products.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h2" sx={{ mb: 2 }}>🔍</Typography>
              <Typography variant="h6" fontWeight={600}>Ürün bulunamadı</Typography>
              <Typography variant="body2" color="text.secondary">Farklı bir arama terimi veya kategori deneyin.</Typography>
            </Box>
          )}

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
              <Pagination
                count={pageCount} page={page}
                onChange={(_, val) => { setPage(val); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                color="primary" shape="rounded" size="large"
              />
            </Box>
          )}
        </Container>

        <Zoom in={showFab && totalCount > 0}>
          <Fab
            component={Link}
            href="/cart"
            sx={{
              position: 'fixed', bottom: 28, right: 28,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white', boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
              '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', transform: 'scale(1.05)' },
              zIndex: 1200,
            }}
            aria-label="Sepete git"
          >
            <Badge badgeContent={totalCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
              <CartIcon />
            </Badge>
          </Fab>
        </Zoom>
      </MainLayout>
    </AuthGuard>
  )
}
