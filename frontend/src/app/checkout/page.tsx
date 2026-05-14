'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Container, Box, Typography, Paper, TextField, Button, Grid, Divider,
  Stack, Alert, CircularProgress, FormControlLabel, Radio, RadioGroup,
  FormControl, List, ListItem, ListItemText, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, Tooltip, Collapse,
  Badge,
} from '@mui/material'
import {
  CheckCircle as CheckIcon, CreditCard as CardIcon,
  LocalShipping as ShippingIcon, Add as AddIcon,
  Delete as DeleteIcon, Close as CloseIcon,
  Edit as EditIcon, VerifiedUser as SecureIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useCart } from '@/context/CartContext'
import { shippingFeeTl } from '@/lib/orderRules'

// ── Tipler ───────────────────────────────────────────────────────────────────

interface SavedAddress {
  id: string
  title: string
  fullName: string
  phone: string
  city: string
  district: string
  detail: string
}

interface SavedCard {
  id: string
  label: string          // "Evim", "İş Kartım" vs.
  cardHolder: string
  last4: string
  expiry: string
}

// ── Formatlama yardımcıları ───────────────────────────────────────────────────

const fmtCard  = (v: string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()
const fmtExp   = (v: string) => { const d=v.replace(/\D/g,'').slice(0,4); return d.length<=2?d:`${d.slice(0,2)}/${d.slice(2)}` }
const fmtPhone = (v: string) => {
  const d=v.replace(/\D/g,'').slice(0,11)
  if(d.length<=4) return d
  if(d.length<=7) return `${d.slice(0,4)} ${d.slice(4)}`
  if(d.length<=9) return `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7)}`
  return `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7,9)} ${d.slice(9)}`
}

// ── Boş form şablonları ───────────────────────────────────────────────────────

const emptyAddress = { title:'', fullName:'', phone:'', city:'', district:'', detail:'' }
const emptyCard    = { label:'', cardNumber:'', cardHolder:'', expiry:'', cvv:'' }

// ─────────────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()

  // ── Adres state ──
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [addrDialogOpen, setAddrDialogOpen] = useState(false)
  const [addrForm, setAddrForm] = useState(emptyAddress)
  const [addrFormError, setAddrFormError] = useState<string | null>(null)

  // ── Kart state ──
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | 'new' | 'cash'>('new')
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [cardForm, setCardForm] = useState(emptyCard)
  const [cardFormError, setCardFormError] = useState<string | null>(null)

  // ── Sipariş state ──
  const [isLoading, setIsLoading] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const shipping = shippingFeeTl(totalPrice)
  const total = totalPrice + shipping

  // ── Firebase token ──
  const getToken = useCallback(async () => {
    const a = getAuth(app)
    return a.currentUser?.getIdToken() ?? null
  }, [])

  // ── Kayıtlı adresleri yükle ──
  useEffect(() => {
    const load = async () => {
      try {
        const a = getAuth(app)
        const u = a.currentUser
        if (!u) return
        const t = await u.getIdToken()
        const r = await axios.get(`/api/auth/users/${u.uid}/saved-addresses`, { headers:{ Authorization:`Bearer ${t}` } })
        const list: SavedAddress[] = Array.isArray(r.data) ? r.data : []
        setSavedAddresses(list)
        if (list.length > 0) setSelectedAddressId(list[0].id)
      } catch { /* sessizce başarısız */ }
    }
    load()
  }, [])

  // ── Kayıtlı kartları localStorage'dan yükle ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem('market_ai_cards')
      if (raw) {
        const cards: SavedCard[] = JSON.parse(raw)
        setSavedCards(cards)
        if (cards.length > 0) setSelectedCardId(cards[0].id)
      }
    } catch { /* */ }
  }, [])

  const saveCardsToStorage = (cards: SavedCard[]) => {
    localStorage.setItem('market_ai_cards', JSON.stringify(cards))
    setSavedCards(cards)
  }

  // ── Adres diyalogu ──────────────────────────────────────────────────────────

  const handleAddrFormChange = (field: keyof typeof addrForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = field === 'phone' ? fmtPhone(e.target.value) : e.target.value
      setAddrForm(prev => ({ ...prev, [field]: v }))
    }

  const handleSaveNewAddress = async () => {
    if (!addrForm.fullName.trim() || !addrForm.phone.trim() || !addrForm.city.trim() || !addrForm.detail.trim()) {
      setAddrFormError('Lütfen zorunlu alanları doldurun (Ad Soyad, Telefon, Şehir, Adres Detayı).')
      return
    }
    if (!addrForm.title.trim()) {
      setAddrFormError('Lütfen adrese bir isim verin (örn: Evim, İş Yerim).')
      return
    }
    setAddrFormError(null)
    try {
      const a = getAuth(app)
      const u = a.currentUser
      if (!u) return
      const t = await u.getIdToken()
      const res = await axios.post(`/api/auth/users/${u.uid}/saved-addresses`, addrForm, { headers:{ Authorization:`Bearer ${t}` } })
      const newAddr: SavedAddress = { id: res.data.id, ...addrForm }
      const updated = [...savedAddresses, newAddr]
      setSavedAddresses(updated)
      setSelectedAddressId(newAddr.id)
      setAddrDialogOpen(false)
      setAddrForm(emptyAddress)
    } catch {
      setAddrFormError('Adres kaydedilemedi, lütfen tekrar deneyin.')
    }
  }

  const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const a = getAuth(app)
      const u = a.currentUser
      if (!u) return
      const t = await u.getIdToken()
      await axios.delete(`/api/auth/users/${u.uid}/saved-addresses/${id}`, { headers:{ Authorization:`Bearer ${t}` } })
      const updated = savedAddresses.filter(a => a.id !== id)
      setSavedAddresses(updated)
      if (selectedAddressId === id) setSelectedAddressId(updated[0]?.id ?? null)
    } catch { /* */ }
  }

  // ── Kart diyalogu ──────────────────────────────────────────────────────────

  const handleCardFormChange = (field: keyof typeof cardForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let v = e.target.value
      if (field === 'cardNumber') v = fmtCard(v)
      if (field === 'expiry')     v = fmtExp(v)
      setCardForm(prev => ({ ...prev, [field]: v }))
    }

  const handleSaveNewCard = () => {
    const raw = cardForm.cardNumber.replace(/\s/g,'')
    if (raw.length < 16)          { setCardFormError('Geçerli bir kart numarası girin (16 hane).'); return }
    if (!cardForm.cardHolder.trim()){ setCardFormError('Kart sahibi adını girin.'); return }
    if (cardForm.expiry.length < 5) { setCardFormError('Son kullanma tarihini girin (AA/YY).'); return }
    if (cardForm.cvv.length < 3)    { setCardFormError('CVV numarasını girin (3 hane).'); return }

    setCardFormError(null)
    const newCard: SavedCard = {
      id: `card-${Date.now()}`,
      label: cardForm.label.trim() || `Kart ...${raw.slice(-4)}`,
      cardHolder: cardForm.cardHolder,
      last4: raw.slice(-4),
      expiry: cardForm.expiry,
    }
    const updated = [...savedCards, newCard]
    saveCardsToStorage(updated)
    setSelectedCardId(newCard.id)
    setCardDialogOpen(false)
    setCardForm(emptyCard)
  }

  const handleDeleteCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = savedCards.filter(c => c.id !== id)
    saveCardsToStorage(updated)
    if (selectedCardId === id) setSelectedCardId(updated[0]?.id ?? 'new')
  }

  // ── Sipariş gönder ─────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (!selectedAddressId && savedAddresses.length > 0) {
      setOrderError('Lütfen bir teslimat adresi seçin.')
      return
    }
    if (savedAddresses.length === 0) {
      setOrderError('Lütfen önce bir teslimat adresi ekleyin.')
      return
    }
    if (selectedCardId === 'new') {
      setOrderError('Lütfen bir ödeme yöntemi seçin veya yeni kart ekleyin.')
      return
    }

    const addr = savedAddresses.find(a => a.id === selectedAddressId)!
    setIsLoading(true)
    setOrderError(null)
    try {
      const token = await getToken()
      const res = await axios.post(
        '/api/auth/orders',
        {
          address: { title: addr.title, fullName: addr.fullName, phone: addr.phone, city: addr.city, district: addr.district, detail: addr.detail },
          payment_method: selectedCardId === 'cash' ? 'cash' : 'card',
          items: items.map(i => ({ id:i.id, name:i.name, price:i.price, quantity:i.quantity, category:i.category, image_url:i.image_url, unit:i.unit||'' })),
          total_price: total,
        },
        token ? { headers:{ Authorization:`Bearer ${token}` } } : {}
      )
      setOrderId(res.data.order_id || `ORD-${Date.now()}`)
      clearCart()
    } catch (err: any) {
      setOrderError(err?.response?.data?.detail || 'Sipariş oluşturulurken bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Sipariş onaylandı ──────────────────────────────────────────────────────

  if (orderId) {
    return (
      <AuthGuard>
        <MainLayout>
          <Container maxWidth="sm">
            <Box sx={{ textAlign:'center', py:{ xs:8, md:12 } }}>
              <Box sx={{ width:110, height:110, borderRadius:'50%', background:'linear-gradient(135deg,#10B981,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center', mx:'auto', mb:3, boxShadow:'0 12px 40px rgba(16,185,129,0.3)' }}>
                <CheckIcon sx={{ fontSize:56, color:'white' }} />
              </Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>Siparişiniz Alındı!</Typography>
              <Typography variant="body1" color="text.secondary">Sipariş No: <strong>{orderId}</strong></Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt:1, mb:4 }}>
                Satın aldığınız ürünler stoğunuza eklendi. En kısa sürede teslim edilecektir.
              </Typography>
              <Stack direction={{ xs:'column', sm:'row' }} spacing={2} justifyContent="center">
                <Button variant="contained" component={Link} href="/" size="large" sx={{ borderRadius:3, px:4 }}>Ana Sayfaya Dön</Button>
                <Button variant="outlined" component={Link} href="/stock" size="large" sx={{ borderRadius:3, px:4 }}>Stoğumu Görüntüle</Button>
              </Stack>
            </Box>
          </Container>
        </MainLayout>
      </AuthGuard>
    )
  }

  // ── Ana checkout sayfası ───────────────────────────────────────────────────

  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="lg" sx={{ pb:8 }}>

          {/* Güvenli alışveriş başlık bandı */}
          <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:3, color:'text.secondary' }}>
            <SecureIcon fontSize="small" sx={{ color:'success.main' }} />
            <Typography variant="body2" fontWeight={600}>Güvenli Alışveriş</Typography>
          </Box>

          <Box sx={{ display:'flex', gap:3, alignItems:'flex-start', flexDirection:{ xs:'column', md:'row' } }}>

            {/* ── Sol kolon: Adres + Ödeme ── */}
            <Box sx={{ flex:1, minWidth:0 }}>

              {/* ──── Teslimat Adresi ──── */}
              <Paper variant="outlined" sx={{ borderRadius:3, overflow:'hidden', mb:2.5 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', px:2.5, py:2, borderBottom:'1px solid', borderColor:'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Typography variant="caption" fontWeight={800} color="white">1</Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>Teslimat Adresi</Typography>
                  </Stack>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setAddrDialogOpen(true)} sx={{ borderRadius:2, textTransform:'none', fontWeight:600 }}>
                    Yeni Adres
                  </Button>
                </Box>

                {savedAddresses.length === 0 ? (
                  <Box sx={{ px:2.5, py:3, textAlign:'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb:1.5 }}>Henüz kayıtlı adresiniz yok.</Typography>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddrDialogOpen(true)} sx={{ borderRadius:2 }}>
                      Adres Ekle
                    </Button>
                  </Box>
                ) : (
                  <RadioGroup value={selectedAddressId ?? ''} onChange={(_, v) => setSelectedAddressId(v)}>
                    {savedAddresses.map((addr, i) => (
                      <React.Fragment key={addr.id}>
                        {i > 0 && <Divider />}
                        <Box
                          sx={{ display:'flex', alignItems:'center', px:2.5, py:1.75, cursor:'pointer', transition:'background 0.15s', '&:hover':{ bgcolor:'action.hover' } }}
                          onClick={() => setSelectedAddressId(addr.id)}
                        >
                          <Radio value={addr.id} size="small" sx={{ mr:1, p:0.5 }} />
                          <Box sx={{ flex:1, minWidth:0 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body2" fontWeight={700}>{addr.title || addr.fullName}</Typography>
                              {i === 0 && <Chip label="Varsayılan" size="small" sx={{ height:18, fontSize:10, bgcolor:'primary.main', color:'white' }} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {addr.detail} — {addr.city}{addr.district ? ` / ${addr.district}` : ''} &nbsp;·&nbsp; {addr.phone}
                            </Typography>
                          </Box>
                          <Tooltip title="Adresi Sil">
                            <IconButton size="small" color="error" onClick={(e) => handleDeleteAddress(addr.id, e)} sx={{ ml:1, '&:hover':{ bgcolor:'error.main', color:'white' } }}>
                              <DeleteIcon sx={{ fontSize:16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </React.Fragment>
                    ))}
                  </RadioGroup>
                )}
              </Paper>

              {/* ──── Ödeme Yöntemi ──── */}
              <Paper variant="outlined" sx={{ borderRadius:3, overflow:'hidden', mb:2.5 }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', px:2.5, py:2, borderBottom:'1px solid', borderColor:'divider' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Typography variant="caption" fontWeight={800} color="white">2</Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700}>Ödeme Yöntemi</Typography>
                  </Stack>
                  <Button size="small" startIcon={<CardIcon />} onClick={() => setCardDialogOpen(true)} sx={{ borderRadius:2, textTransform:'none', fontWeight:600 }}>
                    Yeni Kart
                  </Button>
                </Box>

                <RadioGroup value={selectedCardId} onChange={(_, v) => setSelectedCardId(v)}>
                  {/* Kayıtlı kartlar */}
                  {savedCards.map((card, i) => (
                    <React.Fragment key={card.id}>
                      {i > 0 && <Divider />}
                      <Box
                        sx={{ display:'flex', alignItems:'center', px:2.5, py:1.75, cursor:'pointer', transition:'background 0.15s', '&:hover':{ bgcolor:'action.hover' } }}
                        onClick={() => setSelectedCardId(card.id)}
                      >
                        <Radio value={card.id} size="small" sx={{ mr:1, p:0.5 }} />
                        <Box sx={{ width:40, height:26, borderRadius:1, background:'linear-gradient(135deg,#6366F1,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', mr:1.5, flexShrink:0 }}>
                          <CardIcon sx={{ fontSize:16, color:'white' }} />
                        </Box>
                        <Box sx={{ flex:1 }}>
                          <Typography variant="body2" fontWeight={700}>{card.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {card.cardHolder} &nbsp;·&nbsp; **** **** **** {card.last4} &nbsp;·&nbsp; {card.expiry}
                          </Typography>
                        </Box>
                        <Tooltip title="Kartı Sil">
                          <IconButton size="small" color="error" onClick={(e) => handleDeleteCard(card.id, e)} sx={{ ml:1, '&:hover':{ bgcolor:'error.main', color:'white' } }}>
                            <DeleteIcon sx={{ fontSize:16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </React.Fragment>
                  ))}

                  {savedCards.length > 0 && <Divider />}

                  {/* Yeni kart gir (inline) */}
                  <Box
                    sx={{ display:'flex', alignItems:'center', px:2.5, py:1.75, cursor:'pointer', transition:'background 0.15s', '&:hover':{ bgcolor:'action.hover' } }}
                    onClick={() => setSelectedCardId('new')}
                  >
                    <Radio value="new" size="small" sx={{ mr:1, p:0.5 }} />
                    <AddIcon fontSize="small" sx={{ mr:1.5, color:'text.secondary' }} />
                    <Typography variant="body2" fontWeight={600} color="text.secondary">Yeni kart ekle</Typography>
                    {selectedCardId === 'new' && (
                      <Chip label="Seçildi" size="small" sx={{ ml:'auto', height:18, fontSize:10, bgcolor:'primary.main', color:'white' }} />
                    )}
                  </Box>

                  <Divider />

                  {/* Kapıda ödeme */}
                  <Box
                    sx={{ display:'flex', alignItems:'center', px:2.5, py:1.75, cursor:'pointer', transition:'background 0.15s', '&:hover':{ bgcolor:'action.hover' } }}
                    onClick={() => setSelectedCardId('cash')}
                  >
                    <Radio value="cash" size="small" sx={{ mr:1, p:0.5 }} />
                    <Typography fontSize={18} sx={{ mr:1.5 }}>💵</Typography>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Kapıda Ödeme</Typography>
                      <Typography variant="caption" color="text.secondary">Teslimat sırasında nakit veya kartla ödeyin</Typography>
                    </Box>
                  </Box>
                </RadioGroup>
              </Paper>

              {/* Genel sipariş hatası */}
              {orderError && (
                <Alert severity="error" onClose={() => setOrderError(null)} sx={{ borderRadius:2, mb:2 }}>
                  {orderError}
                </Alert>
              )}
            </Box>

            {/* ── Sağ kolon: Sipariş özeti ── */}
            <Box sx={{ width:{ xs:'100%', md:320 }, flexShrink:0 }}>
              <Paper variant="outlined" sx={{ borderRadius:3, overflow:'hidden', position:{ md:'sticky' }, top:88 }}>
                <Box sx={{ px:2.5, py:2, borderBottom:'1px solid', borderColor:'divider' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Sipariş Özeti</Typography>
                </Box>

                {/* Ürün listesi */}
                <List disablePadding dense sx={{ px:1, pt:1 }}>
                  {items.map((item) => (
                    <ListItem key={item.id} disableGutters sx={{ px:1, py:0.75 }}>
                      <Avatar variant="rounded" src={item.image_url} sx={{ width:36, height:36, mr:1.5, bgcolor:'action.hover', borderRadius:1.5, fontSize:16 }}>
                        {item.name[0]}
                      </Avatar>
                      <ListItemText
                        primary={<Typography variant="body2" fontWeight={600} noWrap>{item.name}</Typography>}
                        secondary={`x${item.quantity}`}
                      />
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {(item.price * item.quantity).toFixed(2)} ₺
                      </Typography>
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ mx:2, mt:1 }} />

                <Stack spacing={1} sx={{ px:2.5, py:2 }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Ürünler</Typography>
                    <Typography variant="body2" fontWeight={600}>{totalPrice.toFixed(2)} ₺</Typography>
                  </Box>
                  <Box sx={{ display:'flex', justifyContent:'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Kargo</Typography>
                    <Typography variant="body2" fontWeight={600} color={shipping===0?'success.main':'text.primary'}>
                      {shipping === 0 ? 'Ücretsiz 🎉' : `${shipping.toFixed(2)} ₺`}
                    </Typography>
                  </Box>
                  {totalPrice < 200 && (
                    <Alert severity="info" sx={{ py:0.5, borderRadius:2, fontSize:11 }}>
                      <strong>{(200-totalPrice).toFixed(2)} ₺</strong> daha ekle, kargo ücretsiz!
                    </Alert>
                  )}
                </Stack>

                <Box sx={{ px:2.5, pb:1, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="h6" fontWeight={800}>Ödenecek Tutar</Typography>
                  <Typography variant="h5" fontWeight={800} color="primary">{total.toFixed(2)} ₺</Typography>
                </Box>

                <Box sx={{ px:2, pb:2.5 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    sx={{ borderRadius:3, py:1.6, fontSize:15, fontWeight:700, background:'linear-gradient(135deg,#6366F1,#8B5CF6)', '&:hover':{ background:'linear-gradient(135deg,#4F46E5,#7C3AED)' } }}
                  >
                    {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Siparişi Onayla'}
                  </Button>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt:1.5 }}>
                    <SecureIcon sx={{ fontSize:14, color:'success.main' }} />
                    <Typography variant="caption" color="text.secondary">256-bit SSL şifreleme ile güvende</Typography>
                  </Stack>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Container>

        {/* ══════════════════════════════════════════
            Yeni Adres Dialog
        ══════════════════════════════════════════ */}
        <Dialog open={addrDialogOpen} onClose={() => { setAddrDialogOpen(false); setAddrFormError(null) }} maxWidth="sm" fullWidth
          PaperProps={{ sx:{ borderRadius:4 } }}>
          <DialogTitle sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', pb:1 }}>
            <Typography variant="h6" fontWeight={700}>Yeni Adres Ekle</Typography>
            <IconButton size="small" onClick={() => { setAddrDialogOpen(false); setAddrFormError(null) }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {addrFormError && <Alert severity="error" sx={{ mb:2, borderRadius:2 }}>{addrFormError}</Alert>}
            <Grid container spacing={2} sx={{ mt:0 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Adres İsmi *" placeholder="örn: Evim, İş Yerim, Annemin Evi"
                  value={addrForm.title} onChange={(e) => setAddrForm(p=>({...p,title:e.target.value}))}
                  helperText="Kayıtlı adresler listesinde bu isim görünecek" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Ad Soyad *" value={addrForm.fullName}
                  onChange={(e) => setAddrForm(p=>({...p,fullName:e.target.value}))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Telefon *" placeholder="0555 123 45 67"
                  value={addrForm.phone} onChange={(e) => setAddrForm(p=>({...p,phone:fmtPhone(e.target.value)}))}
                  inputProps={{ inputMode:'numeric' }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Şehir *" value={addrForm.city}
                  onChange={(e) => setAddrForm(p=>({...p,city:e.target.value}))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="İlçe" value={addrForm.district}
                  onChange={(e) => setAddrForm(p=>({...p,district:e.target.value}))} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Adres Detayı *" multiline rows={3}
                  placeholder="Mahalle, sokak, bina no, daire no…"
                  value={addrForm.detail} onChange={(e) => setAddrForm(p=>({...p,detail:e.target.value}))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px:3, pb:3, gap:1 }}>
            <Button onClick={() => { setAddrDialogOpen(false); setAddrFormError(null) }} sx={{ borderRadius:2 }}>İptal</Button>
            <Button variant="contained" onClick={handleSaveNewAddress} sx={{ borderRadius:2.5, px:3 }}>Adresi Kaydet</Button>
          </DialogActions>
        </Dialog>

        {/* ══════════════════════════════════════════
            Yeni Kart Dialog
        ══════════════════════════════════════════ */}
        <Dialog open={cardDialogOpen} onClose={() => { setCardDialogOpen(false); setCardFormError(null) }} maxWidth="sm" fullWidth
          PaperProps={{ sx:{ borderRadius:4 } }}>
          <DialogTitle sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', pb:1 }}>
            <Typography variant="h6" fontWeight={700}>Yeni Kart Ekle</Typography>
            <IconButton size="small" onClick={() => { setCardDialogOpen(false); setCardFormError(null) }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {cardFormError && <Alert severity="error" sx={{ mb:2, borderRadius:2 }}>{cardFormError}</Alert>}
            <Grid container spacing={2} sx={{ mt:0 }}>
              <Grid item xs={12}>
                <TextField fullWidth label="Kart İsmi (opsiyonel)" placeholder="örn: Benim Kartım"
                  value={cardForm.label} onChange={(e) => setCardForm(p=>({...p,label:e.target.value}))}
                  helperText="Kayıtlı kartlar arasında görünecek isim" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Kart Numarası *" placeholder="0000 0000 0000 0000"
                  value={cardForm.cardNumber} onChange={handleCardFormChange('cardNumber')}
                  inputProps={{ inputMode:'numeric', maxLength:19 }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Kart Sahibi Adı *"
                  value={cardForm.cardHolder} onChange={handleCardFormChange('cardHolder')}
                  inputProps={{ style:{ textTransform:'uppercase' } }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Son Kullanma (AA/YY) *" placeholder="12/26"
                  value={cardForm.expiry} onChange={handleCardFormChange('expiry')}
                  inputProps={{ inputMode:'numeric', maxLength:5 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="CVV *" type="password"
                  value={cardForm.cvv} onChange={handleCardFormChange('cvv')}
                  inputProps={{ maxLength:3, inputMode:'numeric' }} />
              </Grid>
            </Grid>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt:2 }}>
              <SecureIcon fontSize="small" sx={{ color:'success.main' }} />
              <Typography variant="caption" color="text.secondary">Kart bilgileriniz şifreli olarak saklanır</Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px:3, pb:3, gap:1 }}>
            <Button onClick={() => { setCardDialogOpen(false); setCardFormError(null) }} sx={{ borderRadius:2 }}>İptal</Button>
            <Button variant="contained" onClick={handleSaveNewCard} sx={{ borderRadius:2.5, px:3 }}>Kartı Kaydet</Button>
          </DialogActions>
        </Dialog>

      </MainLayout>
    </AuthGuard>
  )
}
