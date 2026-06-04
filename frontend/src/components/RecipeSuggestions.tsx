'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Divider,
  Chip,
  Tooltip,
  alpha,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Avatar,
  TextField,
  Tabs,
  Tab,
  Collapse,
  Skeleton,
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
  Spa as SpaIcon,
  AutoAwesome as AIIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Restaurant as RestaurantIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences'

// ─── Types ───────────────────────────────────────────────────────────────────

interface IngredientForOne {
  product_name: string
  quantity: number
  unit: string
}

interface ParsedSuggestion {
  cleanText: string
  ingredientsForOne: IngredientForOne[] | null
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSuggestion(raw: string): ParsedSuggestion {
  const START = '[MALZEMELER_JSON_START]'
  const END = '[MALZEMELER_JSON_END]'
  const si = raw.indexOf(START)
  const ei = raw.indexOf(END)
  if (si === -1 || ei === -1) return { cleanText: raw.trim(), ingredientsForOne: null }
  const cleanText = raw.slice(0, si).trim()
  const jsonStr = raw.slice(si + START.length, ei).trim()
  try {
    const parsed = JSON.parse(jsonStr)
    return { cleanText, ingredientsForOne: parsed.ingredients_for_one ?? [] }
  } catch {
    return { cleanText, ingredientsForOne: null }
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BREAKFAST_TYPES = [
  { value: 'quick', label: '⚡ Hızlı' },
  { value: 'eggy', label: '🥚 Yumurtalı' },
  { value: 'breadless', label: '🌾 Ekmeksiz' },
  { value: 'sweet', label: '🍯 Tatlı' },
  { value: 'light', label: '🍃 Hafif' },
  { value: 'cold', label: '❄️ Soğuk' },
]

const LUNCH_TYPES = [
  { value: 'quick', label: '⚡ Hızlı' },
  { value: 'light', label: '🍃 Hafif' },
  { value: 'filling', label: '💪 Doyurucu' },
  { value: 'salad', label: '🥗 Salatalı' },
  { value: 'soup', label: '🍲 Çorbalı' },
]

const DINNER_TYPES = [
  { value: 'quick', label: '⚡ Hızlı' },
  { value: 'medium', label: '⏱️ Orta' },
  { value: 'long', label: '🫕 Uzun Süreli' },
  { value: 'meatless', label: '🥬 Etsiz' },
  { value: 'soupy', label: '🍲 Çorbalı' },
  { value: 'onepan', label: '🍳 Tek Tencere' },
]

const MEAL_CONFIGS = [
  {
    id: 'breakfast',
    label: 'Kahvaltı',
    emoji: '🌅',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    color: '#F59E0B',
    endpoint: '/api/recipes/breakfast-suggest',
    bodyKey: 'recipe_type',
    types: BREAKFAST_TYPES,
  },
  {
    id: 'lunch',
    label: 'Öğle Yemeği',
    emoji: '☀️',
    gradient: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
    color: '#10B981',
    endpoint: '/api/recipes/lunch-suggest',
    bodyKey: 'lunch_type',
    types: LUNCH_TYPES,
  },
  {
    id: 'dinner',
    label: 'Akşam Yemeği',
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    color: '#6366F1',
    endpoint: '/api/recipes/dinner-suggest',
    bodyKey: 'suggestion_type',
    types: DINNER_TYPES,
  },
] as const

type MealConfig = typeof MEAL_CONFIGS[number]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RecipeSkeleton() {
  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box flex={1}>
          <Skeleton variant="text" width="55%" height={28} />
          <Skeleton variant="text" width="30%" height={18} />
        </Box>
      </Stack>
      {[90, 82, 88, 65, 78].map((w, i) => (
        <Skeleton key={i} variant="text" width={`${w}%`} height={20} sx={{ mb: 0.5 }} />
      ))}
      <Skeleton variant="rectangular" height={110} sx={{ borderRadius: 2.5, mt: 2 }} />
    </Box>
  )
}

// ─── Recipe title extractor ──────────────────────────────────────────────────

function RecipeContent({ text, accentColor }: { text: string; accentColor: string }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const firstLine = lines[0] ?? ''
  const looksLikeTitle = firstLine.length < 80 && !firstLine.endsWith('.')
  const title = looksLikeTitle ? firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, '') : null
  const body = looksLikeTitle ? lines.slice(1).join('\n') : text

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
        <Avatar sx={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`, width: 44, height: 44 }}>
          <RestaurantIcon sx={{ fontSize: 22, color: 'white' }} />
        </Avatar>
        <Box>
          {title ? (
            <>
              <Typography variant="h6" fontWeight={800} lineHeight={1.25}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                AI Tarif Önerisi
              </Typography>
            </>
          ) : (
            <Typography variant="subtitle1" fontWeight={700}>
              AI Tarif Önerisi
            </Typography>
          )}
        </Box>
      </Stack>
      <Typography
        variant="body2"
        lineHeight={1.95}
        color="text.primary"
        sx={{ whiteSpace: 'pre-line' }}
      >
        {body}
      </Typography>
    </>
  )
}

// ─── MealSection ─────────────────────────────────────────────────────────────

interface MealSectionProps {
  meal: MealConfig
  dietaryContext: string
  visible: boolean
}

function MealSection({ meal, dietaryContext, visible }: MealSectionProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [selected, setSelected] = useState(meal.types[0].value)
  const [mealHint, setMealHint] = useState('')
  const [parsed, setParsed] = useState<ParsedSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [servings, setServings] = useState(1)
  const [isDeducting, setIsDeducting] = useState(false)
  const [deductResult, setDeductResult] = useState<DeductResult | null>(null)
  const [deductError, setDeductError] = useState<string | null>(null)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)

  const fetchSuggestion = async (userRefinement: string) => {
    setIsLoading(true)
    setError(null)
    setParsed(null)
    setDeductResult(null)
    setDeductError(null)
    setServings(1)
    setIngredientsOpen(true)
    try {
      const auth = getAuth(app)
      const token = await auth.currentUser?.getIdToken()
      const body: Record<string, string> = {
        [meal.bodyKey]: selected,
        dietary_preferences: dietaryContext,
      }
      if (userRefinement) body.user_refinement = userRefinement
      const res = await axios.post(
        meal.endpoint,
        body,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      const raw: string = res.data.suggestion || JSON.stringify(res.data, null, 2)
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

  const refine = (instruction: string) => {
    const combined = [mealHint.trim(), instruction.trim()].filter(Boolean).join('\n').trim()
    void fetchSuggestion(combined)
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
        `/api/auth/users/${user.uid}/stock/deduct-recipe`,
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

  const QUICK_FILTERS = [
    { label: '🔄 Başka tarif', instruction: 'Öncekiyle hiç benzemeyen, farklı ve yaratıcı bir tarif öner.' },
    { label: '🚫 Tavuksuz', instruction: 'Tavuk veya tavuk ürünleri kullanma.' },
    { label: '🍃 Daha hafif', instruction: 'Daha hafif, az yağlı ve sindirimi kolay bir tarif öner.' },
    { label: '⚡ 15 dakika', instruction: 'En fazla 15 dakikada hazır olacak hızlı bir tarif öner.' },
  ]

  return (
    <Box sx={{ display: visible ? 'block' : 'none' }}>
      {/* Category chips */}
      <Box mb={3}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          display="block"
          mb={1.5}
          textTransform="uppercase"
          letterSpacing={0.8}
          fontSize="0.68rem"
        >
          Tarif Türü
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {meal.types.map(t => (
            <Chip
              key={t.value}
              label={t.label}
              onClick={() => setSelected(t.value)}
              sx={{
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                ...(selected === t.value
                  ? {
                      background: meal.gradient,
                      color: 'white',
                      border: 'none',
                      boxShadow: `0 4px 14px ${alpha(meal.color, 0.45)}`,
                      transform: 'translateY(-2px)',
                    }
                  : {
                      border: `1px solid ${theme.palette.divider}`,
                      bgcolor: 'transparent',
                      '&:hover': {
                        bgcolor: alpha(meal.color, isDark ? 0.15 : 0.08),
                        borderColor: meal.color,
                        transform: 'translateY(-1px)',
                      },
                    }),
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Hint input */}
      <TextField
        label="Bugün ne yemek istersiniz? (isteğe bağlı)"
        placeholder="Örn: baharatlı, az kalorili, fırında bir şeyler…"
        value={mealHint}
        onChange={e => setMealHint(e.target.value)}
        fullWidth
        multiline
        minRows={1}
        maxRows={3}
        size="small"
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
        }}
      />

      {/* CTA Button */}
      <Button
        variant="contained"
        fullWidth
        onClick={() => void fetchSuggestion(mealHint.trim())}
        disabled={isLoading}
        startIcon={
          isLoading
            ? <CircularProgress size={18} color="inherit" />
            : <AIIcon />
        }
        sx={{
          py: 1.5,
          borderRadius: 2.5,
          fontWeight: 800,
          fontSize: '0.95rem',
          letterSpacing: 0.3,
          background: isLoading ? undefined : meal.gradient,
          boxShadow: isLoading ? 'none' : `0 6px 20px ${alpha(meal.color, 0.4)}`,
          transition: 'all 0.2s ease',
          '&:hover:not(:disabled)': {
            transform: 'translateY(-2px)',
            boxShadow: `0 10px 28px ${alpha(meal.color, 0.5)}`,
          },
          '&:active:not(:disabled)': { transform: 'translateY(0)' },
        }}
      >
        {isLoading ? 'Tarif hazırlanıyor…' : `${meal.emoji}  ${meal.label} Tarifi Öner`}
      </Button>

      {/* Quick filters (shown before first result) */}
      {!parsed && !isLoading && (
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600}>
            Hızlı tercih:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {QUICK_FILTERS.map(q => (
              <Chip
                key={q.label}
                label={q.label}
                size="small"
                variant="outlined"
                onClick={() => refine(q.instruction)}
                disabled={isLoading}
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': { borderColor: meal.color, color: meal.color, bgcolor: alpha(meal.color, 0.06) },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert
          severity={error.includes('kota') || error.includes('Günlük') ? 'warning' : 'error'}
          sx={{ mt: 2, borderRadius: 2.5 }}
          onClose={() => setError(null)}
          action={
            <Button size="small" color="inherit" onClick={() => void fetchSuggestion(mealHint.trim())}>
              Tekrar Dene
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading skeleton */}
      {isLoading && <RecipeSkeleton />}

      {/* Recipe result */}
      {parsed && !isLoading && (
        <Box
          sx={{
            mt: 3,
            animation: 'recipeIn 0.35s ease',
            '@keyframes recipeIn': {
              from: { opacity: 0, transform: 'translateY(14px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {/* Recipe card */}
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3.5,
              overflow: 'hidden',
            }}
          >
            {/* Accent top bar */}
            <Box sx={{ height: 4, background: meal.gradient, flexShrink: 0 }} />
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <RecipeContent text={parsed.cleanText} accentColor={meal.color} />
            </CardContent>
          </Card>

          {/* Refinement chips */}
          <Box mt={2}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
              Beğenmediniz mi? Yeni öneri alın:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {QUICK_FILTERS.map(q => (
                <Chip
                  key={q.label}
                  label={q.label}
                  size="small"
                  variant="outlined"
                  onClick={() => refine(q.instruction)}
                  disabled={isLoading}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    '&:hover': { borderColor: meal.color, color: meal.color, bgcolor: alpha(meal.color, 0.06) },
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Ingredients collapsible panel */}
          {parsed.ingredientsForOne && parsed.ingredientsForOne.length > 0 && (
            <Card
              elevation={0}
              sx={{
                mt: 2.5,
                border: `1px solid ${alpha(meal.color, 0.3)}`,
                borderRadius: 3,
                background: alpha(meal.color, isDark ? 0.07 : 0.04),
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <Box
                onClick={() => setIngredientsOpen(o => !o)}
                sx={{
                  px: 2.5,
                  py: 1.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s',
                  '&:hover': { bgcolor: alpha(meal.color, isDark ? 0.08 : 0.05) },
                }}
              >
                <Avatar sx={{ bgcolor: alpha(meal.color, 0.18), width: 36, height: 36 }}>
                  <PeopleIcon sx={{ color: meal.color, fontSize: 18 }} />
                </Avatar>
                <Box flex={1}>
                  <Typography variant="subtitle2" fontWeight={700} color={meal.color}>
                    1 Kişilik Malzeme Listesi
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {parsed.ingredientsForOne.length} malzeme · Porsiyon sayısını ayarlayın
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ color: meal.color, pointerEvents: 'none' }}>
                  {ingredientsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>

              <Collapse in={ingredientsOpen}>
                <Divider />
                <Box sx={{ px: 2.5, pt: 1.5, pb: 2.5 }}>
                  {/* Ingredient table */}
                  <Table size="small" sx={{ mb: 1 }}>
                    <TableBody>
                      {parsed.ingredientsForOne.map((ing, i) => (
                        <TableRow
                          key={i}
                          sx={{
                            '&:last-child td': { border: 0 },
                            '&:hover': { bgcolor: alpha(meal.color, 0.06) },
                            transition: 'background 0.12s',
                          }}
                        >
                          <TableCell sx={{ py: 0.9, pl: 0, fontWeight: 600, border: 'none', width: '55%' }}>
                            {ing.product_name}
                          </TableCell>
                          <TableCell sx={{ py: 0.9, border: 'none' }}>
                            <Chip
                              label={`${ing.quantity} ${ing.unit}`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                bgcolor: alpha(meal.color, 0.14),
                                color: meal.color,
                                border: 'none',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Divider sx={{ my: 2 }} />

                  {/* Servings picker + deduct button */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                        Kaç kişilik yaptınız?
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => setServings(s => Math.max(1, s - 1))}
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1.5,
                            width: 30, height: 30,
                            '&:hover': { borderColor: meal.color },
                          }}
                        >
                          <RemoveIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography fontWeight={800} minWidth={30} textAlign="center" fontSize="1.15rem">
                          {servings}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setServings(s => Math.min(20, s + 1))}
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1.5,
                            width: 30, height: 30,
                            '&:hover': { borderColor: meal.color },
                          }}
                        >
                          <AddIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography variant="body2" color="text.secondary">kişilik</Typography>
                      </Stack>
                    </Box>

                    <Button
                      variant="contained"
                      disabled={isDeducting || !!deductResult}
                      startIcon={
                        isDeducting
                          ? <CircularProgress size={14} color="inherit" />
                          : <CheckIcon />
                      }
                      onClick={handleDeductStock}
                      sx={{
                        borderRadius: 2.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        background: deductResult ? undefined : meal.gradient,
                        boxShadow: deductResult ? 'none' : `0 4px 16px ${alpha(meal.color, 0.35)}`,
                        transition: 'all 0.2s ease',
                        '&:hover:not(:disabled)': {
                          transform: 'translateY(-1px)',
                          boxShadow: `0 8px 22px ${alpha(meal.color, 0.45)}`,
                        },
                      }}
                    >
                      {isDeducting
                        ? 'Güncelleniyor…'
                        : deductResult
                        ? '✓ Güncellendi'
                        : '🍳 Tarifi Yaptım — Stoğu Güncelle'}
                    </Button>
                  </Stack>

                  {/* Deduct errors */}
                  {deductError && (
                    <Alert
                      severity="error"
                      sx={{ mt: 2, borderRadius: 2 }}
                      onClose={() => setDeductError(null)}
                    >
                      {deductError}
                    </Alert>
                  )}

                  {/* Deduct results */}
                  {deductResult && (
                    <Stack spacing={1} mt={2}>
                      {deductResult.deducted.length > 0 && (
                        <Alert icon={<CheckIcon fontSize="small" />} severity="success" sx={{ borderRadius: 2 }}>
                          <strong>{deductResult.deducted.length} ürün güncellendi:</strong>{' '}
                          {deductResult.deducted.map(d => `${d.name} (${d.new_qty} kaldı)`).join(' · ')}
                        </Alert>
                      )}
                      {deductResult.low_stock.length > 0 && (
                        <Alert icon={<WarningIcon fontSize="small" />} severity="warning" sx={{ borderRadius: 2 }}>
                          <strong>Az kalan:</strong>{' '}
                          {deductResult.low_stock.map(l => `${l.name} (${l.quantity} adet)`).join(', ')}
                        </Alert>
                      )}
                      {deductResult.depleted.length > 0 && (
                        <Alert icon={<ErrorIcon fontSize="small" />} severity="error" sx={{ borderRadius: 2 }}>
                          <strong>Stoktan biten:</strong> {deductResult.depleted.join(', ')}
                        </Alert>
                      )}
                    </Stack>
                  )}
                </Box>
              </Collapse>
            </Card>
          )}

          {/* Buy suggestions */}
          {deductResult && deductResult.buy_suggestions.length > 0 && (
            <Card
              elevation={0}
              sx={{
                mt: 2,
                border: `1px solid ${alpha('#F59E0B', 0.35)}`,
                borderRadius: 3,
                background: alpha('#F59E0B', isDark ? 0.07 : 0.04),
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 2.5, py: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <CartIcon fontSize="small" sx={{ color: '#D97706' }} />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#D97706' }}>
                    Mağazadan Temin Edebilirsiniz
                  </Typography>
                  <Chip
                    label={deductResult.buy_suggestions.length}
                    size="small"
                    sx={{ height: 20, fontWeight: 800, bgcolor: alpha('#F59E0B', 0.2), color: '#D97706' }}
                  />
                </Stack>

                <Stack spacing={1.25}>
                  {deductResult.buy_suggestions.map((s, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2.5,
                        border: `1px solid ${alpha('#F59E0B', 0.2)}`,
                        bgcolor: alpha(theme.palette.background.paper, isDark ? 0.4 : 0.8),
                        backdropFilter: 'blur(4px)',
                        transition: 'background 0.15s',
                        '&:hover': { bgcolor: alpha('#F59E0B', isDark ? 0.1 : 0.05) },
                      }}
                    >
                      <Avatar
                        src={s.image_url}
                        variant="rounded"
                        sx={{ width: 42, height: 42, bgcolor: alpha('#F59E0B', 0.15), flexShrink: 0 }}
                      >
                        🛒
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {s.store_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.reason === 'bitti'
                            ? 'Stoğunuzda tükendi'
                            : s.reason === 'azaldi'
                            ? `Sadece ${s.quantity} adet kaldı`
                            : 'Stoğunuzda bulunmuyor'}
                        </Typography>
                      </Box>
                      <Chip
                        label={s.reason === 'azaldi' ? 'Az kaldı' : s.reason === 'bitti' ? 'Bitti' : 'Yok'}
                        size="small"
                        color={s.reason === 'azaldi' ? 'warning' : 'error'}
                        sx={{ fontWeight: 700, flexShrink: 0 }}
                      />
                    </Box>
                  ))}
                </Stack>

                <Button
                  component={Link}
                  href="/products"
                  variant="outlined"
                  size="small"
                  startIcon={<CartIcon />}
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                    fontWeight: 700,
                    borderColor: '#D97706',
                    color: '#D97706',
                    '&:hover': { bgcolor: alpha('#F59E0B', 0.08), borderColor: '#B45309' },
                  }}
                >
                  Ürünleri İncele
                </Button>
              </Box>
            </Card>
          )}
        </Box>
      )}
    </Box>
  )
}

// ─── RecipeSuggestions (default export) ───────────────────────────────────────

export default function RecipeSuggestions() {
  const theme = useTheme()
  const { preferences, buildDietaryContext } = useDietaryPreferences()
  const [activeTab, setActiveTab] = useState(0)

  const dietCtx = buildDietaryContext()
  const hasDiet = preferences.tags.length > 0 || !!preferences.custom_note?.trim()

  return (
    <Box>
      {/* Diet banner */}
      {hasDiet ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mb: 3,
            px: 2,
            py: 1.5,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.08))',
            border: '1px solid rgba(99,102,241,0.22)',
          }}
        >
          <DietIcon fontSize="small" sx={{ color: '#6366F1' }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: '#6366F1' }}>
            Aktif diyet tercihleri:
          </Typography>
          {preferences.tags.map(tag => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366F1, #EC4899)',
                color: '#fff',
                fontSize: '0.7rem',
                height: 22,
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
                sx={{ fontSize: '0.7rem', cursor: 'help', height: 22 }}
              />
            </Tooltip>
          )}
          <Box flex={1} />
          <Typography
            component={Link}
            href="/preferences"
            variant="caption"
            sx={{ color: '#6366F1', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
          >
            Düzenle →
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 3,
            px: 2,
            py: 1.5,
            borderRadius: 2.5,
            bgcolor: alpha(theme.palette.info.main, 0.06),
            border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
          }}
        >
          <SpaIcon fontSize="small" sx={{ color: theme.palette.info.main, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">
            💡 Tarifleri kişiselleştirmek için{' '}
            <Typography
              component={Link}
              href="/preferences"
              variant="caption"
              sx={{ color: '#6366F1', fontWeight: 700, textDecoration: 'underline' }}
            >
              diyet tercihlerinizi
            </Typography>{' '}
            ayarlayabilirsiniz.
          </Typography>
        </Box>
      )}

      {/* Tab bar */}
      <Card
        elevation={0}
        sx={{
          mb: 3.5,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v: number) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.875rem',
              textTransform: 'none',
              minHeight: 60,
              transition: 'color 0.2s',
              gap: 0.75,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              background: MEAL_CONFIGS[activeTab].gradient,
              transition: 'background 0.25s',
            },
          }}
        >
          {MEAL_CONFIGS.map((meal, idx) => (
            <Tab
              key={meal.id}
              label={
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{meal.emoji}</span>
                  <span>{meal.label}</span>
                </Stack>
              }
              sx={{
                color: activeTab === idx ? meal.color : 'text.secondary',
                '&.Mui-selected': { color: meal.color },
              }}
            />
          ))}
        </Tabs>
      </Card>

      {/* Meal panels — all mounted so state persists across tab switches */}
      {MEAL_CONFIGS.map((meal, idx) => (
        <MealSection
          key={meal.id}
          meal={meal}
          dietaryContext={dietCtx}
          visible={activeTab === idx}
        />
      ))}
    </Box>
  )
}
