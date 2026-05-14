'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Container, Box, Typography, Card, CardMedia, CardContent,
  IconButton, Button, Divider, Stack, Chip, TextField,
  CircularProgress, Paper, Avatar, Fab, Tooltip, Zoom,
  Collapse, Badge, Alert,
} from '@mui/material'
import {
  Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon,
  ShoppingCart as CartIcon, ArrowForward as ArrowIcon,
  AutoAwesome as SparkleIcon, Send as SendIcon,
  SmartToy as AiIcon, Person as PersonIcon,
  Close as CloseIcon, KeyboardArrowDown as CollapseIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useCart } from '@/context/CartContext'
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences'
import { shippingFeeTl } from '@/lib/orderRules'

interface Message {
  role: 'user' | 'ai'
  text: string
  loading?: boolean
}

const QUICK_QUESTIONS = [
  { emoji: '🥗', text: 'Sepetim sağlıklı mı?' },
  { emoji: '🍳', text: 'Bu ürünlerle hangi yemekler yapabilirim?' },
  { emoji: '📅', text: 'Kaç günlük alışveriş bu?' },
  { emoji: '💰', text: 'Tasarruf önerilerin var mı?' },
  { emoji: '🧪', text: 'Besin değeri eksiklerim neler?' },
  { emoji: '🥩', text: 'Protein kaynakları yeterli mi?' },
]

const CATEGORY_LABELS: Record<string, string> = {
  meyve_sebze: '🥦 Meyve & Sebze',
  et_tavuk: '🥩 Et & Tavuk',
  sut: '🥛 Süt Ürünleri',
  firin: '🍞 Fırın',
  icecek: '🧃 İçecek',
  dondurulmus: '🧊 Dondurulmuş',
}

export default function CartPage() {
  const { items, totalCount, totalPrice, updateQuantity, removeItem, clearCart } = useCart()
  const { buildDietaryContext } = useDietaryPreferences()
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Merhaba! 👋 Sepetiniz hakkında her şeyi sorabilirsiniz. Hazır sorulardan birini seçebilir ya da kendi sorunuzu yazabilirsiniz.',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [messages, chatOpen])

  const shipping = shippingFeeTl(totalPrice)
  const total = totalPrice + shipping

  const askAI = async (question: string) => {
    if (!question.trim() || isAsking) return
    const q = question.trim()
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInputText('')
    setIsAsking(true)
    setMessages((prev) => [...prev, { role: 'ai', text: '', loading: true }])

    try {
      const auth = getAuth(app)
      const token = await auth.currentUser?.getIdToken()
      const res = await axios.post(
        '/api/chat/question',
        {
          question: `Sepetimde şu ürünler var: ${items.map((i) => `${i.name} x${i.quantity}`).join(', ')}.${buildDietaryContext()} Sorum: ${q}`,
          stock_items: items.map((i) => i.name),
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: 'ai', text: res.data.answer || 'Yanıt alınamadı.' },
      ])
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      const isQuota = e.response?.status === 503 || e.response?.data?.detail?.includes('kota')
      setMessages((prev) => [
        ...prev.filter((m) => !m.loading),
        {
          role: 'ai',
          text: isQuota
            ? 'Günlük AI kotası doldu. Birkaç saat sonra tekrar deneyin veya yeni bir API anahtarı oluşturun.'
            : 'Şu an yanıt veremiyorum. Lütfen tekrar deneyin.',
        },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  /* ── Boş sepet ── */
  if (totalCount === 0) {
    return (
      <AuthGuard>
        <MainLayout>
          <Container maxWidth="sm">
            <Box
              sx={{
                textAlign: 'center',
                py: { xs: 8, md: 14 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 40px rgba(99,102,241,0.3)',
                  mb: 1,
                }}
              >
                <CartIcon sx={{ fontSize: 52, color: 'white' }} />
              </Box>
              <Typography variant="h5" fontWeight={800}>
                Sepetiniz boş
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Ürünler sayfasından dilediğiniz ürünleri sepetinize ekleyebilirsiniz.
              </Typography>
              <Button
                variant="contained"
                component={Link}
                href="/products"
                size="large"
                endIcon={<ArrowIcon />}
                sx={{ mt: 1, borderRadius: 3, px: 4, py: 1.4 }}
              >
                Alışverişe Başla
              </Button>
            </Box>
          </Container>
        </MainLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="lg" sx={{ pb: 14 }}>
          {/* Başlık */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>
                Sepetim
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                {totalCount} ürün
              </Typography>
            </Box>
            <Button variant="text" color="error" size="small" onClick={clearCart}>
              Sepeti Boşalt
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>

            {/* ── Ürün Kartları ── */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={2}>
                {items.map((item) => (
                  <Card
                    key={item.id}
                    elevation={0}
                    sx={{
                      display: 'flex',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      overflow: 'hidden',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.08)' },
                    }}
                  >
                    {/* Ürün görseli */}
                    <Box
                      sx={{
                        width: { xs: 90, sm: 110 },
                        flexShrink: 0,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {item.image_url ? (
                        <CardMedia
                          component="img"
                          image={item.image_url}
                          alt={item.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 36 }}>
                          {item.category === 'meyve_sebze' ? '🥦' :
                            item.category === 'et_tavuk' ? '🥩' :
                            item.category === 'sut' ? '🥛' :
                            item.category === 'firin' ? '🍞' :
                            item.category === 'icecek' ? '🧃' :
                            item.category === 'dondurulmus' ? '🧊' : '🛒'}
                        </Typography>
                      )}
                    </Box>

                    <CardContent
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        py: { xs: 1.5, sm: 2 },
                        px: { xs: 1.5, sm: 2.5 },
                        '&:last-child': { pb: { xs: 1.5, sm: 2 } },
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      }}
                    >
                      {/* İsim & kategori */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700} noWrap>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </Typography>
                        <Typography variant="body2" color="primary" fontWeight={800} sx={{ mt: 0.3 }}>
                          {item.price.toFixed(2)} ₺{item.unit ? ` / ${item.unit}` : ''}
                        </Typography>
                      </Box>

                      {/* Miktar & fiyat */}
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, width: 30, height: 30 }}
                          >
                            <RemoveIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <Typography fontWeight={800} sx={{ minWidth: 26, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, width: 30, height: 30 }}
                          >
                            <AddIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Stack>

                        <Typography fontWeight={700} sx={{ minWidth: 64, textAlign: 'right', color: 'text.primary' }}>
                          {(item.price * item.quantity).toFixed(2)} ₺
                        </Typography>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeItem(item.id)}
                          sx={{ '&:hover': { bgcolor: 'error.main', color: 'white' } }}
                        >
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              <Button
                variant="text"
                component={Link}
                href="/products"
                sx={{ mt: 2.5, borderRadius: 2, color: 'text.secondary' }}
              >
                ← Alışverişe Devam Et
              </Button>
            </Box>

            {/* ── Sipariş Özeti ── */}
            <Box sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  position: { md: 'sticky' },
                  top: 88,
                }}
              >
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Sipariş Özeti
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Ara Toplam</Typography>
                    <Typography fontWeight={600}>{totalPrice.toFixed(2)} ₺</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">Kargo</Typography>
                    <Typography fontWeight={600} color={shipping === 0 ? 'success.main' : 'text.primary'}>
                      {shipping === 0 ? 'Ücretsiz 🎉' : `${shipping.toFixed(2)} ₺`}
                    </Typography>
                  </Box>
                  {totalPrice < 200 && (
                    <Alert severity="info" sx={{ py: 0.5, borderRadius: 2, fontSize: 12 }}>
                      <strong>{(200 - totalPrice).toFixed(2)} ₺</strong> daha ekle, kargo ücretsiz!
                    </Alert>
                  )}
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight={800}>Toplam</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary">
                      {total.toFixed(2)} ₺
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  component={Link}
                  href="/checkout"
                  endIcon={<ArrowIcon />}
                  sx={{ py: 1.5, borderRadius: 3, fontSize: 15, fontWeight: 700 }}
                >
                  Ödemeye Geç
                </Button>
              </Card>
            </Box>
          </Box>
        </Container>

        {/* ════════════════════════════════════════════
            Floating AI Chat Widget
        ════════════════════════════════════════════ */}
        <Box
          sx={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 1.5,
            zIndex: 1300,
          }}
        >
          {/* Chat paneli */}
          <Zoom in={chatOpen} unmountOnExit>
            <Paper
              elevation={8}
              sx={{
                width: { xs: 'calc(100vw - 56px)', sm: 360 },
                maxWidth: 360,
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              {/* Panel başlık */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <SparkleIcon sx={{ fontSize: 18, color: 'white' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="white">
                    AI Sepet Danışmanı
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                    Her şeyi sorabilirsin
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setChatOpen(false)}
                  sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <CollapseIcon />
                </IconButton>
              </Box>

              {/* Hazır sorular */}
              <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {QUICK_QUESTIONS.map((q) => (
                    <Chip
                      key={q.text}
                      label={`${q.emoji} ${q.text}`}
                      size="small"
                      onClick={() => askAI(q.text)}
                      disabled={isAsking}
                      sx={{
                        fontSize: 11,
                        height: 26,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          color: 'white',
                          borderColor: 'transparent',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ mx: 1.5 }} />

              {/* Mesajlar */}
              <Box
                sx={{
                  height: 240,
                  overflowY: 'auto',
                  px: 1.5,
                  py: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                  bgcolor: 'background.default',
                }}
              >
                {messages.map((msg, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      gap: 0.75,
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        background: msg.role === 'ai'
                          ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                          : 'linear-gradient(135deg, #10B981, #0D9488)',
                        fontSize: 12,
                        mb: 0.25,
                      }}
                    >
                      {msg.role === 'ai'
                        ? <SparkleIcon sx={{ fontSize: 13 }} />
                        : <PersonIcon sx={{ fontSize: 13 }} />}
                    </Avatar>
                    <Box
                      sx={{
                        px: 1.5,
                        py: 0.9,
                        maxWidth: '78%',
                        borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                        color: msg.role === 'user' ? 'white' : 'text.primary',
                      }}
                    >
                      {msg.loading ? (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <CircularProgress size={12} color="inherit" />
                          <Typography variant="caption">Düşünüyor…</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ lineHeight: 1.65, whiteSpace: 'pre-line', display: 'block' }}>
                          {msg.text}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  display: 'flex',
                  gap: 0.75,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  placeholder="Bir şey sor…"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAI(inputText) }
                  }}
                  disabled={isAsking}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, fontSize: 13 } }}
                />
                <IconButton
                  size="small"
                  onClick={() => askAI(inputText)}
                  disabled={!inputText.trim() || isAsking}
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    alignSelf: 'center',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: 'white',
                    borderRadius: 2,
                    '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' },
                    '&.Mui-disabled': { opacity: 0.45, color: 'white' },
                  }}
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Paper>
          </Zoom>

          {/* Açma butonu */}
          <Tooltip title={chatOpen ? '' : 'AI Danışmana Sor'} placement="left">
            <Fab
              onClick={() => setChatOpen((prev) => !prev)}
              sx={{
                background: chatOpen
                  ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
                  : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: 'white',
                boxShadow: '0 8px 28px rgba(99,102,241,0.45)',
                transition: 'all 0.2s',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  transform: 'scale(1.06)',
                },
              }}
              aria-label="AI Danışman"
            >
              {chatOpen ? <CloseIcon /> : <SparkleIcon />}
            </Fab>
          </Tooltip>
        </Box>
      </MainLayout>
    </AuthGuard>
  )
}
