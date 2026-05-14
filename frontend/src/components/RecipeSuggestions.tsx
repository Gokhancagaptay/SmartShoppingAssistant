'use client'

import { useState } from 'react'
import {
  Box, Typography, Button, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Alert, Card, CardContent, Stack, Divider,
  Chip, Tooltip, alpha, useTheme, Table, TableBody, TableCell, TableRow,
  IconButton, Avatar, TextField,
} from '@mui/material'
import {
  FreeBreakfast as BreakfastIcon,
  DinnerDining as DinnerIcon,
  LunchDining as LunchIcon,
  Tune as DietIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  Spa as SpaIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences'


interface IngredientForOne {
  product_name: string
  quantity: number
  unit: string
}

interface ParsedSuggestion {
  /** Kullanıcıya gösterilecek temiz tarif metni (JSON bloğu çıkarılmış) */
  cleanText: string
  /** 1 kişilik porsiyon malzemeleri — JSON parse edilebildiyse dolu, aksi hâlde null */
  ingredientsForOne: IngredientForOne[] | null
}

/**
 * Gemini yanıtından [MALZEMELER_JSON_START]...[MALZEMELER_JSON_END] bloğunu ayırır.
 * Temiz tarif metnini ve ayrıştırılmış 1 kişilik malzeme listesini döner.
 */
function parseSuggestion(raw: string): ParsedSuggestion {
  const START_TAG = '[MALZEMELER_JSON_START]'
  const END_TAG = '[MALZEMELER_JSON_END]'
  const startIdx = raw.indexOf(START_TAG)
  const endIdx = raw.indexOf(END_TAG)

  if (startIdx === -1 || endIdx === -1) {
    return { cleanText: raw.trim(), ingredientsForOne: null }
  }

  const cleanText = raw.slice(0, startIdx).trim()
  const jsonStr = raw.slice(startIdx + START_TAG.length, endIdx).trim()

  try {
    const parsed = JSON.parse(jsonStr)
    const ingredientsForOne: IngredientForOne[] = parsed.ingredients_for_one ?? []
    return { cleanText, ingredientsForOne }
  } catch {
    // JSON parse edilemezse sadece temiz metni göster
    return { cleanText, ingredientsForOne: null }
  }
}

const BREAKFAST_TYPES = [
  { value: 'quick', label: 'Hızlı' },
  { value: 'eggy', label: 'Yumurtalı' },
  { value: 'breadless', label: 'Ekmeksiz' },
  { value: 'sweet', label: 'Tatlı' },
  { value: 'light', label: 'Hafif' },
  { value: 'cold', label: 'Soğuk' },
]

const DINNER_TYPES = [
  { value: 'quick', label: 'Hızlı' },
  { value: 'medium', label: 'Orta Süreli' },
  { value: 'long', label: 'Uzun Süreli' },
  { value: 'meatless', label: 'Etsiz' },
  { value: 'soupy', label: 'Çorbalı' },
  { value: 'onepan', label: 'Tek Tencere' },
]

const LUNCH_TYPES = [
  { value: 'quick', label: 'Hızlı' },
  { value: 'light', label: 'Hafif' },
  { value: 'filling', label: 'Doyurucu' },
  { value: 'salad', label: 'Salatali' },
  { value: 'soup', label: 'Çorbalı' },
]

interface MealSectionProps {
  title: string
  icon: React.ReactNode
  types: { value: string; label: string }[]
  endpoint: string
  bodyKey: string
  /** Diyet bağlamı metni — AI prompt'una eklenir */
  dietaryContext: string
}

interface BuySuggestion {
  name: string
  store_name: string
  image_url: string
  reason: 'bitti' | 'azaldi' | 'stokta_yok'
  quantity?: number
}

interface DeductResult {
  deducted: { name: string; new_qty: number }[]
  low_stock: { name: string; quantity: number }[]
  depleted: string[]
  not_found: string[]
  buy_suggestions: BuySuggestion[]
}

/** Tek bir öğün için öneri kartı */
function MealSection({ title, icon, types, endpoint, bodyKey, dietaryContext }: MealSectionProps) {
  const theme = useTheme()
  const [selected, setSelected] = useState(types[0].value)
  const [mealHint, setMealHint] = useState('')
  const [parsed, setParsed] = useState<ParsedSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [servings, setServings] = useState(1)
  const [isDeducting, setIsDeducting] = useState(false)
  const [deductResult, setDeductResult] = useState<DeductResult | null>(null)
  const [deductError, setDeductError] = useState<string | null>(null)

  const mergeRefinement = (instruction: string) =>
    [mealHint.trim(), instruction.trim()].filter(Boolean).join('\n').trim()

  const fetchSuggestion = async (userRefinement: string) => {
    setIsLoading(true)
    setError(null)
    setParsed(null)
    setDeductResult(null)
    setDeductError(null)
    setServings(1)
    try {
      const auth = getAuth(app)
      const token = await auth.currentUser?.getIdToken()
      const body: Record<string, string> = {
        [bodyKey]: selected,
        dietary_preferences: dietaryContext,
      }
      if (userRefinement) body.user_refinement = userRefinement
      const response = await axios.post(endpoint, body, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      const raw: string = response.data.suggestion || JSON.stringify(response.data, null, 2)
      setParsed(parseSuggestion(raw))
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      const detail = e.response?.data?.detail ?? ''
      const status = e.response?.status

      if (status === 503 || detail.includes('Günlük') || detail.includes('yoğun')) {
        setError(detail || 'Yapay zeka servisi şu an meşgul. Lütfen birkaç dakika sonra tekrar deneyin.')
      } else {
        setError(detail || 'Öneri alınırken bir hata oluştu.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggest = () => {
    void fetchSuggestion(mealHint.trim())
  }

  const refine = (instruction: string) => {
    void fetchSuggestion(mergeRefinement(instruction))
  }

  const handleDeductStock = async () => {
    if (!parsed?.ingredientsForOne?.length) return
    setIsDeducting(true)
    setDeductResult(null)
    setDeductError(null)
    try {
      const authInstance = getAuth(app)
      const user = authInstance.currentUser
      if (!user) throw new Error('Giriş yapmanız gerekiyor')
      const token = await user.getIdToken()
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/users/${user.uid}/stock/deduct-recipe`,
        { ingredients: parsed.ingredientsForOne, servings },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setDeductResult(data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setDeductError(e.response?.data?.detail ?? e.message ?? 'Stok güncellenemedi.')
    } finally {
      setIsDeducting(false)
    }
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          {icon}
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Tip</InputLabel>
            <Select value={selected} label="Tip" onChange={(e) => setSelected(e.target.value)}>
              {types.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleSuggest}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isLoading ? 'Yükleniyor…' : 'Öneri Al'}
          </Button>
        </Stack>

        <TextField
          label="Bugün özellikle ne yemek istiyorsunuz? (isteğe bağlı)"
          placeholder="Örn: mercimek çorbası, fırın makarna…"
          value={mealHint}
          onChange={(e) => setMealHint(e.target.value)}
          fullWidth
          size="small"
          sx={{ mt: 2, maxWidth: 560 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Hızlı tercih — ilk önerinizde de kullanılır; metin kutusu ile birleştirilir.
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
          <Chip
            icon={<RefreshIcon sx={{ '&&': { fontSize: 18 } }} />}
            label="Başka tarif"
            onClick={() => refine('Önceki öneriyi beğenmedim veya farklı bir şey istiyorum; aynı öğün tipinde tamamen farklı ve yaratıcı başka bir tarif öner.')}
            disabled={isLoading}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label="Tavuk kullanmadan"
            onClick={() => refine('Tavuk, hindi veya bunların ürünlerini kullanma; et kullanacaksan başka protein tercih et veya vejetaryen kal.')}
            disabled={isLoading}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<SpaIcon sx={{ '&&': { fontSize: 18 } }} />}
            label="Daha hafif"
            onClick={() => refine('Öncekinden daha hafif, daha az yağlı ve sindirimi kolay bir tarif öner.')}
            disabled={isLoading}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        {error && (
          <Alert
            severity={error.includes('kota') || error.includes('quota') || error.includes('limit') ? 'warning' : 'error'}
            sx={{ mt: 2, borderRadius: 2 }}
            onClose={() => setError(null)}
          >
            {error.includes('Günlük yapay zeka kotası') ? (
              <>
                <strong>Günlük AI kotası doldu.</strong> Gemini API ücretsiz sınırına ulaşıldı.
                Birkaç saat sonra tekrar deneyin ya da{' '}
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                   style={{ color: 'inherit', fontWeight: 700 }}>
                  yeni API anahtarı oluşturun
                </a>.
              </>
            ) : error}
          </Alert>
        )}

        {parsed && (
          <Box sx={{ mt: 2 }}>
            {/* ── Tarif metni ── */}
            <Box
              sx={{
                p: 2.5,
                bgcolor: 'action.hover',
                borderRadius: 2,
                whiteSpace: 'pre-line',
              }}
            >
              <Typography variant="body2" lineHeight={1.8}>
                {parsed.cleanText}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                Beğenmediniz mi? Yeni öneri alın (üstteki isteğinizle birleştirilir):
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <Button size="small" variant="outlined" disabled={isLoading} onClick={() => refine('Önceki öneriyi beğenmedim; aynı öğün tipinde tamamen farklı bir tarif öner.')}>
                  Başka tarif
                </Button>
                <Button size="small" variant="outlined" disabled={isLoading} onClick={() => refine('Tavuk veya tavuk ürünü kullanma.')}>
                  Tavuk kullanmadan
                </Button>
                <Button size="small" variant="outlined" disabled={isLoading} onClick={() => refine('Bugün özellikle hafif ve çabuk pişen bir şey istiyorum.')}>
                  Hızlı ve hafif
                </Button>
              </Stack>
            </Box>

            {/* ── 1 Kişilik Porsiyon Kartı + Stok Düşüm ── */}
            {parsed.ingredientsForOne && parsed.ingredientsForOne.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                  background: alpha(theme.palette.secondary.main, 0.05),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <PeopleIcon fontSize="small" color="secondary" />
                  <Typography variant="subtitle2" fontWeight={700} color="secondary.main">
                    1 Kişilik Porsiyon Miktarları
                  </Typography>
                </Stack>
                <Table size="small">
                  <TableBody>
                    {parsed.ingredientsForOne.map((ing, i) => (
                      <TableRow
                        key={i}
                        sx={{
                          '&:last-child td': { border: 0 },
                          '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.07) },
                        }}
                      >
                        <TableCell sx={{ py: 0.5, pl: 0, fontWeight: 600, border: 'none', width: '55%' }}>
                          {ing.product_name}
                        </TableCell>
                        <TableCell sx={{ py: 0.5, border: 'none', color: 'text.secondary' }}>
                          {ing.quantity} {ing.unit}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Divider sx={{ my: 1.5 }} />

                {/* Porsiyon sayısı seçici + Tarifi Yaptım butonu */}
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                      Kaç kişilik yaptınız?
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => setServings(s => Math.max(1, s - 1))}
                        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, p: 0.3 }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography
                        fontWeight={700}
                        minWidth={32}
                        textAlign="center"
                        fontSize="1.1rem"
                      >
                        {servings}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setServings(s => Math.min(20, s + 1))}
                        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, p: 0.3 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="body2" color="text.secondary" ml={0.5}>
                        kişilik
                      </Typography>
                    </Stack>
                  </Box>

                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    disabled={isDeducting || !!deductResult}
                    startIcon={isDeducting ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
                    onClick={handleDeductStock}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      background: deductResult
                        ? undefined
                        : `linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)`,
                      boxShadow: deductResult ? 'none' : `0 4px 14px ${alpha('#7C3AED', 0.35)}`,
                    }}
                  >
                    {isDeducting ? 'Güncelleniyor…' : deductResult ? 'Güncellendi ✓' : 'Tarifi Yaptım! Stoğu Güncelle'}
                  </Button>
                </Stack>

                {deductError && (
                  <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }} onClose={() => setDeductError(null)}>
                    {deductError}
                  </Alert>
                )}

                {/* Stok Düşüm Sonuç Paneli */}
                {deductResult && (
                  <Box mt={1.5}>
                    {/* Başarılı düşümler */}
                    {deductResult.deducted.length > 0 && (
                      <Alert
                        icon={<CheckIcon fontSize="small" />}
                        severity="success"
                        sx={{ mb: 1, borderRadius: 2 }}
                      >
                        <strong>{deductResult.deducted.length} ürünün stoğu güncellendi.</strong>{' '}
                        {deductResult.deducted.map(d => `${d.name} (${d.new_qty} kaldı)`).join(' · ')}
                      </Alert>
                    )}

                    {/* Azalan ürünler */}
                    {deductResult.low_stock.length > 0 && (
                      <Alert
                        icon={<WarningIcon fontSize="small" />}
                        severity="warning"
                        sx={{ mb: 1, borderRadius: 2 }}
                      >
                        <strong>Az kalan ürünler:</strong>{' '}
                        {deductResult.low_stock.map(l => `${l.name} (${l.quantity} adet)`).join(', ')}
                      </Alert>
                    )}

                    {/* Biten ürünler */}
                    {deductResult.depleted.length > 0 && (
                      <Alert
                        icon={<ErrorIcon fontSize="small" />}
                        severity="error"
                        sx={{ mb: 1, borderRadius: 2 }}
                      >
                        <strong>Stoktan biten ürünler:</strong> {deductResult.depleted.join(', ')}
                      </Alert>
                    )}

                    {/* Mağazadan alınabilecek ürünler */}
                    {deductResult.buy_suggestions.length > 0 && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
                          background: alpha(theme.palette.warning.main, 0.06),
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                          <CartIcon fontSize="small" color="warning" />
                          <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                            Mağazamızdan Temin Edebilirsiniz
                          </Typography>
                        </Stack>
                        <Stack spacing={1}>
                          {deductResult.buy_suggestions.map((s, i) => (
                            <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                              <Avatar
                                src={s.image_url}
                                variant="rounded"
                                sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.warning.main, 0.15) }}
                              >
                                🛒
                              </Avatar>
                              <Box flex={1}>
                                <Typography variant="body2" fontWeight={600}>
                                  {s.store_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {s.reason === 'bitti' ? 'Stoğunuzda bitti' : s.reason === 'azaldi' ? `Sadece ${s.quantity} adet kaldı` : 'Stoğunuzda yok'}
                                </Typography>
                              </Box>
                              <Chip
                                label={s.reason === 'azaldi' ? 'Az kaldı' : 'Bitti'}
                                size="small"
                                color={s.reason === 'azaldi' ? 'warning' : 'error'}
                                sx={{ fontWeight: 700 }}
                              />
                            </Stack>
                          ))}
                        </Stack>
                        <Button
                          component={Link}
                          href="/products"
                          variant="outlined"
                          color="warning"
                          size="small"
                          startIcon={<CartIcon />}
                          sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700 }}
                        >
                          Ürünleri İncele
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

/** Kahvaltı, öğle ve akşam yemeği öneri bileşeni.
 *  POST /api/recipes/breakfast-suggest, /dinner-suggest, /lunch-suggest endpoint'lerini kullanır.
 *  Kullanıcının diyet tercihleri her öneri isteğine otomatik olarak eklenir. */
export default function RecipeSuggestions() {
  const theme = useTheme()
  const { preferences, buildDietaryContext } = useDietaryPreferences()
  const dietCtx = buildDietaryContext()
  const hasDiet = preferences.tags.length > 0 || preferences.custom_note?.trim()

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Yapay Zeka Tarif Önerileri
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Stoğunuzdaki malzemelere göre kişiselleştirilmiş tarif önerileri alın.
      </Typography>

      {/* Diyet tercihi özeti bandı */}
      {hasDiet ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mb: 3,
            p: 1.5,
            borderRadius: 2,
            background: alpha(theme.palette.secondary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}`,
          }}
        >
          <DietIcon fontSize="small" color="secondary" />
          <Typography variant="caption" color="secondary.main" fontWeight={600}>
            Aktif diyet tercihleri:
          </Typography>
          {preferences.tags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                fontWeight: 600,
                background: `linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)`,
                color: '#fff',
                fontSize: '0.72rem',
              }}
            />
          ))}
          {preferences.custom_note?.trim() && (
            <Tooltip title={preferences.custom_note} arrow>
              <Chip
                label="Özel not ›"
                size="small"
                variant="outlined"
                color="secondary"
                sx={{ fontSize: '0.72rem', cursor: 'help' }}
              />
            </Tooltip>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            component={Link}
            href="/preferences"
            variant="caption"
            sx={{ color: 'secondary.main', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Düzenle
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 3,
            p: 1.5,
            borderRadius: 2,
            background: alpha(theme.palette.info.main, 0.06),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            💡 Tarifleri kişiselleştirmek için{' '}
            <Typography
              component={Link}
              href="/preferences"
              variant="caption"
              sx={{ color: 'secondary.main', fontWeight: 700, textDecoration: 'underline' }}
            >
              diyet tercihlerinizi
            </Typography>{' '}
            ayarlayabilirsiniz.
          </Typography>
        </Box>
      )}

      <Stack spacing={3}>
        <MealSection
          title="Kahvaltı Önerisi"
          icon={<BreakfastIcon color="warning" />}
          types={BREAKFAST_TYPES}
          endpoint="/api/recipes/breakfast-suggest"
          bodyKey="recipe_type"
          dietaryContext={dietCtx}
        />

        <Divider />

        <MealSection
          title="Öğle Yemeği Önerisi"
          icon={<LunchIcon color="success" />}
          types={LUNCH_TYPES}
          endpoint="/api/recipes/lunch-suggest"
          bodyKey="lunch_type"
          dietaryContext={dietCtx}
        />

        <Divider />

        <MealSection
          title="Akşam Yemeği Önerisi"
          icon={<DinnerIcon color="primary" />}
          types={DINNER_TYPES}
          endpoint="/api/recipes/dinner-suggest"
          bodyKey="suggestion_type"
          dietaryContext={dietCtx}
        />
      </Stack>
    </Box>
  )
}
