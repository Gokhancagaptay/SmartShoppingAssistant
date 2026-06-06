'use client'

import React from 'react'
import {
  Container, Box, Typography, Grid, Card, CardMedia, CardContent,
  CardActions, Button, Chip, Stack, Rating, IconButton, Tooltip, Badge,
} from '@mui/material'
import {
  Favorite as FavoriteIcon, AddShoppingCart as CartAddIcon,
  ShoppingCart as CartIcon, OpenInNew as DetailIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useFavorites } from '@/context/FavoritesContext'
import { useCart } from '@/context/CartContext'
import { useToast } from '@/context/ToastContext'

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  meyve_sebze: { label: 'Meyve & Sebze', emoji: '🥦' },
  et_tavuk:    { label: 'Et & Tavuk',    emoji: '🥩' },
  sut:         { label: 'Süt Ürünleri',  emoji: '🥛' },
  firin:       { label: 'Fırın',          emoji: '🍞' },
  icecek:      { label: 'İçecek',         emoji: '🧃' },
  dondurulmus: { label: 'Dondurulmuş',   emoji: '🧊' },
}

export default function FavoritesPage() {
  const { favorites, toggleFavorite, favoriteCount } = useFavorites()
  const { addItem, items, totalCount } = useCart()
  const toast = useToast()

  const favoriteList = Object.values(favorites)

  const getCartQty = (id: string) => items.find((i) => i.id === id)?.quantity ?? 0

  const handleAddToCart = (product: typeof favoriteList[0]) => {
    if (getCartQty(product.id) >= product.stock) {
      toast.warning(`"${product.name}" için maksimum stok adedine ulaştınız.`)
      return
    }
    addItem({
      id: product.id, name: product.name, price: product.price,
      image_url: product.image_url, category: product.category,
      unit: product.unit, stock: product.stock,
    })
    toast.success(`${product.name} sepete eklendi.`)
  }

  return (
    <AuthGuard userOnly>
      <MainLayout>
        <Container maxWidth="xl" sx={{ pb: 10 }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>
                Favorilerim <FavoriteIcon sx={{ color: 'error.main', fontSize: 32, verticalAlign: 'middle', ml: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {favoriteCount === 0 ? 'Henüz favori ürün yok' : `${favoriteCount} favori ürün`}
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

          {favoriteList.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Typography fontSize={60} mb={2}>💝</Typography>
              <Typography variant="h6" fontWeight={700} mb={1}>Henüz favori ürününüz yok</Typography>
              <Typography color="text.secondary" mb={3}>
                Ürünler sayfasında beğendiğiniz ürünlerin kalbine basarak favorilere ekleyebilirsiniz.
              </Typography>
              <Button
                variant="contained"
                component={Link}
                href="/products"
                sx={{ borderRadius: 2.5, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
              >
                Ürünlere Gözat
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {favoriteList.map((product) => {
                const cartQty = getCartQty(product.id)
                const catMeta = CATEGORY_LABELS[product.category]
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%', display: 'flex', flexDirection: 'column',
                        border: '1px solid', borderColor: cartQty > 0 ? 'primary.main' : 'divider',
                        transition: 'all 0.25s ease',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', borderColor: 'primary.main' },
                      }}
                    >
                      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                        <CardMedia
                          component="img"
                          height="175"
                          image={product.image_url || `https://placehold.co/300x175/E8E8FF/6366F1?text=${encodeURIComponent(product.name)}`}
                          alt={product.name}
                          sx={{ objectFit: 'cover', transition: 'transform 0.3s', '.MuiCard-root:hover &': { transform: 'scale(1.05)' } }}
                          onError={(e: any) => { e.target.src = `https://placehold.co/300x175/E8E8FF/6366F1?text=${encodeURIComponent(product.name)}` }}
                        />
                        <Chip
                          label={product.stock === 0 ? 'Tükendi' : product.stock <= 5 ? `Son ${product.stock} adet!` : 'Stokta'}
                          size="small"
                          sx={{
                            position: 'absolute', top: 8, right: 8,
                            bgcolor: product.stock === 0 ? 'error.main' : product.stock <= 5 ? 'warning.main' : 'success.main',
                            color: 'white', fontWeight: 700, fontSize: 11,
                          }}
                        />
                        <Tooltip title="Favorilerden Çıkar">
                          <IconButton
                            size="small"
                            onClick={() => toggleFavorite(product)}
                            sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'background.paper', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                          >
                            <FavoriteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <CardContent sx={{ flex: 1, pb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap title={product.name}>{product.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {catMeta?.emoji} {catMeta?.label || product.category}
                        </Typography>
                        {product.avg_rating != null && product.avg_rating > 0 && (
                          <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
                            <Rating value={product.avg_rating} readOnly size="small" precision={0.5} />
                            <Typography variant="caption" color="text.secondary">
                              ({product.review_count ?? 0})
                            </Typography>
                          </Stack>
                        )}
                        <Typography variant="h6" fontWeight={800} color="primary" sx={{ mt: 0.5 }}>
                          {product.price.toFixed(2)} ₺
                          {product.unit && (
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              / {product.unit}
                            </Typography>
                          )}
                        </Typography>
                      </CardContent>

                      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 0.5 }}>
                        <Button
                          variant={cartQty > 0 ? 'outlined' : 'contained'}
                          fullWidth
                          size="small"
                          startIcon={<CartAddIcon fontSize="small" />}
                          disabled={product.stock === 0}
                          onClick={() => handleAddToCart(product)}
                          sx={{ borderRadius: 2, py: 0.75, flex: 1 }}
                        >
                          {cartQty > 0 ? `Tekrar Ekle (${cartQty})` : 'Sepete Ekle'}
                        </Button>
                        <Tooltip title="Ürün Detayı">
                          <IconButton size="small" component={Link} href={`/products/${product.id}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                            <DetailIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
