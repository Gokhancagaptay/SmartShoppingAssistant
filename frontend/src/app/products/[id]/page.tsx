'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Container, Box, Typography, Grid, Stack, Chip, Button, Rating,
  Card, CardContent, TextField, Divider, Alert, CircularProgress,
  Avatar, IconButton, Tooltip, Skeleton,
} from '@mui/material'
import {
  ArrowBack as BackIcon, AddShoppingCart as CartAddIcon,
  Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon, Star as StarIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/context/FavoritesContext'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'

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

interface Review {
  _id: string
  uid: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

interface ReviewsData {
  reviews: Review[]
  avg_rating: number
  review_count: number
}

async function getToken() {
  return getAuth(app).currentUser?.getIdToken() ?? null
}

const CATEGORY_LABELS: Record<string, string> = {
  meyve_sebze: 'Meyve & Sebze',
  et_tavuk: 'Et & Tavuk',
  sut: 'Süt Ürünleri',
  firin: 'Fırın',
  icecek: 'İçecek',
  dondurulmus: 'Dondurulmuş',
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addItem, items } = useCart()
  const { isFavorite, toggleFavorite } = useFavorites()
  const toast = useToast()
  const { user } = useAuth()

  const [reviewRating, setReviewRating] = useState<number | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  const { data: product, isLoading: productLoading } = useQuery<Product>(
    ['product', id],
    async () => {
      const res = await axios.get(`/api/products/${id}`)
      return res.data
    },
    { enabled: !!id },
  )

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery<ReviewsData>(
    ['product-reviews', id],
    async () => {
      const res = await axios.get(`/api/products/${id}/reviews`)
      return res.data
    },
    { enabled: !!id },
  )

  const submitReview = useMutation(
    async ({ rating, comment }: { rating: number; comment: string }) => {
      const token = await getToken()
      return axios.post(
        `/api/products/${id}/reviews`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['product-reviews', id])
        queryClient.invalidateQueries(['product', id])
        queryClient.invalidateQueries(['products'])
        setReviewRating(null)
        setReviewComment('')
        toast.success('Yorumunuz kaydedildi.')
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Yorum gönderilemedi.')
      },
    },
  )

  const deleteReview = useMutation(
    async () => {
      const token = await getToken()
      return axios.delete(`/api/products/${id}/reviews/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['product-reviews', id])
        queryClient.invalidateQueries(['product', id])
        queryClient.invalidateQueries(['products'])
        toast.success('Yorumunuz silindi.')
      },
      onError: () => toast.error('Yorum silinemedi.'),
    },
  )

  const cartQty = product ? (items.find((i) => i.id === product._id)?.quantity ?? 0) : 0
  const myReview = reviewsData?.reviews.find((r) => r.uid === user?.uid)

  const handleAddToCart = () => {
    if (!product) return
    if (cartQty >= product.stock) {
      toast.warning(`"${product.name}" için maksimum stok adedine ulaştınız.`)
      return
    }
    addItem({
      id: product._id, name: product.name, price: product.price,
      image_url: product.image_url, category: product.category,
      unit: product.unit, stock: product.stock,
    })
    toast.success(`${product.name} sepete eklendi.`)
  }

  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="lg" sx={{ pb: 8 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => router.back()}
            sx={{ mb: 3, textTransform: 'none', fontWeight: 600 }}
          >
            Geri Dön
          </Button>

          {productLoading ? (
            <Grid container spacing={4}>
              <Grid item xs={12} md={5}><Skeleton variant="rectangular" height={380} sx={{ borderRadius: 3 }} /></Grid>
              <Grid item xs={12} md={7}><Skeleton height={40} sx={{ mb: 1 }} /><Skeleton height={30} width="60%" /></Grid>
            </Grid>
          ) : product ? (
            <Grid container spacing={4}>
              {/* Ürün görseli */}
              <Grid item xs={12} md={5}>
                <Box
                  component="img"
                  src={product.image_url || `https://placehold.co/480x380/E8E8FF/6366F1?text=${encodeURIComponent(product.name)}`}
                  alt={product.name}
                  onError={(e: any) => { e.target.src = `https://placehold.co/480x380/E8E8FF/6366F1?text=${encodeURIComponent(product.name)}` }}
                  sx={{ width: '100%', borderRadius: 3, objectFit: 'cover', maxHeight: 400, border: '1px solid', borderColor: 'divider' }}
                />
              </Grid>

              {/* Ürün bilgileri */}
              <Grid item xs={12} md={7}>
                <Stack spacing={2}>
                  <Box>
                    <Chip
                      label={CATEGORY_LABELS[product.category] || product.category}
                      size="small"
                      sx={{ mb: 1, bgcolor: 'action.hover', fontWeight: 600 }}
                    />
                    <Typography variant="h4" fontWeight={800}>{product.name}</Typography>
                    {product.unit && (
                      <Typography variant="body2" color="text.secondary">Birim: {product.unit}</Typography>
                    )}
                  </Box>

                  {/* Puan */}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Rating value={product.avg_rating} readOnly precision={0.5} />
                    <Typography variant="body2" color="text.secondary">
                      {product.avg_rating > 0 ? `${product.avg_rating} / 5` : 'Henüz puan yok'}
                      {product.review_count > 0 && ` (${product.review_count} yorum)`}
                    </Typography>
                  </Stack>

                  {/* Fiyat + stok */}
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="h4" fontWeight={800} color="primary">
                      {product.price.toFixed(2)} ₺
                    </Typography>
                    <Chip
                      label={
                        product.stock === 0 ? 'Tükendi' :
                        product.stock <= 5 ? `Son ${product.stock} adet!` : 'Stokta'
                      }
                      sx={{
                        fontWeight: 700,
                        bgcolor: product.stock === 0 ? 'error.main' : product.stock <= 5 ? 'warning.main' : 'success.main',
                        color: 'white',
                      }}
                    />
                  </Stack>

                  <Divider />

                  {/* Sepet + Favori butonları */}
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CartAddIcon />}
                      disabled={product.stock === 0}
                      onClick={handleAddToCart}
                      sx={{ flex: 1, borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                    >
                      {product.stock === 0 ? 'Tükendi' : cartQty > 0 ? `Sepete Ekle (${cartQty} adet)` : 'Sepete Ekle'}
                    </Button>
                    <Tooltip title={isFavorite(product._id) ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}>
                      <IconButton
                        size="large"
                        onClick={() => toggleFavorite({
                          id: product._id, name: product.name, price: product.price,
                          image_url: product.image_url, category: product.category,
                          stock: product.stock, unit: product.unit,
                        })}
                        sx={{
                          border: '1px solid', borderColor: 'divider', borderRadius: 2.5,
                          color: isFavorite(product._id) ? 'error.main' : 'text.secondary',
                        }}
                      >
                        {isFavorite(product._id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="error">Ürün bulunamadı.</Alert>
          )}

          {/* ── Yorumlar ── */}
          <Box mt={6}>
            <Typography variant="h5" fontWeight={800} mb={3}>
              Yorumlar
              {reviewsData && reviewsData.review_count > 0 && (
                <Stack direction="row" alignItems="center" spacing={1} component="span" sx={{ ml: 2, display: 'inline-flex' }}>
                  <StarIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                  <Typography variant="h6" fontWeight={700} component="span">{reviewsData.avg_rating}</Typography>
                  <Typography variant="body2" color="text.secondary" component="span">({reviewsData.review_count})</Typography>
                </Stack>
              )}
            </Typography>

            {/* Yorum formu */}
            {user && !myReview && (
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2.5, mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>Yorum Yaz</Typography>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">Puanınız:</Typography>
                    <Rating
                      value={reviewRating}
                      onChange={(_, val) => setReviewRating(val)}
                      size="large"
                    />
                  </Stack>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Bu ürün hakkında ne düşünüyorsunuz?"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Box>
                    <Button
                      variant="contained"
                      disabled={!reviewRating || !reviewComment.trim() || submitReview.isLoading}
                      onClick={() => reviewRating && submitReview.mutate({ rating: reviewRating, comment: reviewComment })}
                      sx={{ borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
                    >
                      {submitReview.isLoading ? <CircularProgress size={20} color="inherit" /> : 'Yorum Gönder'}
                    </Button>
                  </Box>
                </Stack>
              </Card>
            )}

            {myReview && (
              <Card elevation={0} sx={{ border: '2px solid', borderColor: 'primary.main', borderRadius: 3, p: 2.5, mb: 3, bgcolor: 'action.hover' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="primary.main" fontWeight={700} textTransform="uppercase">Yorumunuz</Typography>
                    <Rating value={myReview.rating} readOnly size="small" sx={{ display: 'block', mt: 0.5 }} />
                    <Typography variant="body2" mt={0.5}>{myReview.comment}</Typography>
                  </Box>
                  <Tooltip title="Yorumu Sil">
                    <IconButton size="small" color="error" onClick={() => deleteReview.mutate()}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Card>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <Stack spacing={2}>
                {[1, 2].map(i => <Skeleton key={i} height={80} sx={{ borderRadius: 2 }} />)}
              </Stack>
            ) : reviewsData && reviewsData.reviews.filter(r => r.uid !== user?.uid).length > 0 ? (
              <Stack spacing={2}>
                {reviewsData.reviews
                  .filter(r => r.uid !== user?.uid)
                  .map((review) => (
                    <Card key={review._id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
                      <Stack direction="row" spacing={1.5}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                          {review.user_name[0]?.toUpperCase() ?? '?'}
                        </Avatar>
                        <Box flex={1}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                            <Typography variant="body2" fontWeight={700}>{review.user_name}</Typography>
                            <Rating value={review.rating} readOnly size="small" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">{review.comment}</Typography>
                          <Typography variant="caption" color="text.disabled" mt={0.5} display="block">
                            {new Date(review.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  ))}
              </Stack>
            ) : (
              !myReview && (
                <Box textAlign="center" py={5}>
                  <Typography fontSize={36} mb={1}>⭐</Typography>
                  <Typography color="text.secondary">Henüz yorum yapılmamış. İlk yorumu siz yapın!</Typography>
                </Box>
              )
            )}
          </Box>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
