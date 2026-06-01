'use client'

import { useState } from 'react'
import {
  Box, Typography, Button, TextField, Card, CardContent,
  CircularProgress, Alert, Chip, Stack, Avatar,
  Divider, alpha, useTheme, Skeleton, Collapse,
} from '@mui/material'
import {
  Analytics as AnalyticsIcon,
  Inventory2 as StockIcon,
  AutoAwesome as AIIcon,
  Lightbulb as TipIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { useQuery } from 'react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  analysis?: string
  nutrition_info?: Record<string, string | number>
  recommendations?: string[]
}

interface StockOverviewDto {
  total_product_kinds: number
  total_units: number
  item_names: string[]
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalysisSkeleton() {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', mt: 3 }}>
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #10B981, #0D9488)' }} />
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Skeleton variant="circular" width={44} height={44} />
          <Box flex={1}>
            <Skeleton variant="text" width="45%" height={24} />
            <Skeleton variant="text" width="30%" height={18} />
          </Box>
        </Stack>
        {[90, 82, 75, 60].map((w, i) => (
          <Skeleton key={i} variant="text" width={`${w}%`} height={18} sx={{ mb: 0.5 }} />
        ))}
        <Box mt={2.5}>
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
        </Box>
      </CardContent>
    </Card>
  )
}

// ─── Nutrition stat card ──────────────────────────────────────────────────────

function NutritionCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Card
      elevation={0}
      sx={{
        p: 1.75,
        border: '1px solid',
        borderColor: alpha(color, 0.25),
        borderRadius: 2.5,
        bgcolor: alpha(color, 0.05),
        textAlign: 'center',
        minWidth: 90,
        flex: 1,
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="capitalize">
        {label}
      </Typography>
    </Card>
  )
}

// ─── NutritionAnalysis ────────────────────────────────────────────────────────

const STAT_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function NutritionAnalysis() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [ingredients, setIngredients] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stockExpanded, setStockExpanded] = useState(true)

  const { data: stockOverview, isLoading: overviewLoading } = useQuery({
    queryKey: ['nutrition-stock-overview'],
    queryFn: async () => {
      const auth = getAuth(app)
      const token = await auth.currentUser?.getIdToken()
      const { data } = await axios.get<StockOverviewDto>('/api/nutrition/stock-overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      return data
    },
    staleTime: 60_000,
    retry: 1,
  })

  const handleAnalyze = async () => {
    const trimmed = ingredients.trim()
    if (!trimmed) {
      setError('Lütfen analiz edilecek malzemeleri giriniz.')
      return
    }
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const auth = getAuth(app)
      const token = await auth.currentUser?.getIdToken()
      const response = await axios.post(
        '/api/recipes/analyze',
        { ingredients: trimmed.split(',').map(s => s.trim()).filter(Boolean) },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      setResult(response.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Analiz sırasında bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  const fillFromStock = () => {
    if (stockOverview?.item_names?.length) {
      setIngredients(stockOverview.item_names.join(', '))
    }
  }

  return (
    <Box>
      {/* ── Stok özeti ── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          onClick={() => setStockExpanded(o => !o)}
          sx={{
            px: 2.5,
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            transition: 'background 0.15s',
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
          }}
        >
          <Avatar sx={{ bgcolor: alpha('#10B981', 0.12), width: 38, height: 38 }}>
            <StockIcon sx={{ color: '#10B981', fontSize: 20 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Stoğunuzdaki Malzemeler
            </Typography>
            {stockOverview && (
              <Typography variant="caption" color="text.secondary">
                {stockOverview.total_product_kinds} çeşit · {stockOverview.total_units.toFixed(0)} birim
              </Typography>
            )}
          </Box>
          {stockExpanded ? <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
        </Box>

        <Collapse in={stockExpanded}>
          <Divider />
          <Box sx={{ px: 2.5, py: 2 }}>
            {overviewLoading ? (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {[80, 100, 65, 90, 75].map((w, i) => (
                  <Skeleton key={i} variant="rounded" width={w} height={28} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            ) : stockOverview?.item_names?.length ? (
              <>
                <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
                  {stockOverview.item_names.map(name => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      onClick={() => {
                        setIngredients(prev => {
                          const list = prev.split(',').map(s => s.trim()).filter(Boolean)
                          if (!list.includes(name)) return [...list, name].join(', ')
                          return prev
                        })
                      }}
                      sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        bgcolor: alpha('#10B981', isDark ? 0.2 : 0.1),
                        color: isDark ? '#34D399' : '#065F46',
                        border: `1px solid ${alpha('#10B981', isDark ? 0.45 : 0.3)}`,
                        '&:hover': { bgcolor: alpha('#10B981', isDark ? 0.32 : 0.2), borderColor: '#10B981' },
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={fillFromStock}
                  startIcon={<AIIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    borderColor: '#10B981',
                    color: isDark ? '#34D399' : '#065F46',
                    '&:hover': { bgcolor: alpha('#10B981', isDark ? 0.15 : 0.08), borderColor: '#059669' },
                  }}
                >
                  Tümünü Analiz Et
                </Button>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Stoğunuzda henüz ürün yok. Sipariş vererek stok oluşturun.
              </Typography>
            )}
          </Box>
        </Collapse>
      </Card>

      {/* ── Input + CTA ── */}
      <Card
        elevation={0}
        sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, p: { xs: 2, sm: 2.5 } }}
      >
        <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
          Manuel Malzeme Girişi
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Malzemeleri virgülle ayırarak yazın veya yukarıdan chip'lere tıklayın.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          placeholder="örn: elma, yulaf, süt, yumurta, muz, tam buğday ekmeği…"
          value={ingredients}
          onChange={e => setIngredients(e.target.value)}
          size="small"
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
        />
        <Button
          variant="contained"
          fullWidth
          onClick={handleAnalyze}
          disabled={isLoading || !ingredients.trim()}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <AnalyticsIcon />}
          sx={{
            py: 1.4,
            borderRadius: 2.5,
            fontWeight: 800,
            fontSize: '0.9rem',
            background: isLoading ? undefined : 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)',
            boxShadow: isLoading ? 'none' : '0 6px 20px rgba(16,185,129,0.35)',
            transition: 'all 0.2s ease',
            '&:hover:not(:disabled)': {
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 28px rgba(16,185,129,0.45)',
            },
          }}
        >
          {isLoading ? 'Analiz ediliyor…' : '🔬 Besin Değerlerini Analiz Et'}
        </Button>
      </Card>

      {/* ── Error ── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Skeleton ── */}
      {isLoading && <AnalysisSkeleton />}

      {/* ── Result ── */}
      {result && !isLoading && (
        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden',
            animation: 'resultIn 0.35s ease',
            '@keyframes resultIn': {
              from: { opacity: 0, transform: 'translateY(12px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          {/* Accent strip */}
          <Box sx={{ height: 4, background: 'linear-gradient(90deg, #10B981, #0D9488)' }} />

          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
              <Avatar sx={{ background: 'linear-gradient(135deg, #10B981, #0D9488)', width: 44, height: 44 }}>
                <AnalyticsIcon sx={{ color: 'white', fontSize: 22 }} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                  Besin Değeri Raporu
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  AI Beslenme Analizi
                </Typography>
              </Box>
            </Stack>

            {/* Analysis text */}
            {result.analysis && (
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  mb: 3,
                }}
              >
                <Typography variant="body2" lineHeight={1.9} sx={{ whiteSpace: 'pre-line' }}>
                  {result.analysis}
                </Typography>
              </Box>
            )}

            {/* Nutrition stats */}
            {result.nutrition_info && Object.keys(result.nutrition_info).length > 0 && (
              <Box mb={3}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary" textTransform="uppercase" letterSpacing={0.7} fontSize="0.72rem">
                  Besin Değerleri
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1.5}>
                  {Object.entries(result.nutrition_info).map(([key, value], i) => (
                    <NutritionCard
                      key={key}
                      label={key}
                      value={value}
                      color={STAT_COLORS[i % STAT_COLORS.length]}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <Box>
                <Divider sx={{ mb: 2.5 }} />
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <TipIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.7} fontSize="0.72rem">
                    Öneriler
                  </Typography>
                </Stack>
                <Stack spacing={1.25}>
                  {result.recommendations.map((rec, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.25,
                        p: 1.75,
                        borderRadius: 2.5,
                        bgcolor: alpha('#F59E0B', 0.05),
                        border: `1px solid ${alpha('#F59E0B', 0.2)}`,
                      }}
                    >
                      <CheckIcon sx={{ color: '#D97706', fontSize: 18, mt: 0.1, flexShrink: 0 }} />
                      <Typography variant="body2" lineHeight={1.7}>
                        {rec}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
