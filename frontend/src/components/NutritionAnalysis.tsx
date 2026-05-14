'use client'

import { useState } from 'react'
import {
  Box, Typography, Button, TextField, Card, CardContent,
  CircularProgress, Alert, Grid, Chip, Stack,
} from '@mui/material'
import { Analytics as AnalyticsIcon, Inventory2 as StockOverviewIcon } from '@mui/icons-material'
import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { useQuery } from 'react-query'

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

/** Kullanıcının malzeme listesine göre besin analizi yapan bileşen.
 *  Backend'deki POST /api/recipes/analyze endpoint'ini kullanır. */
export default function NutritionAnalysis() {
  const [ingredients, setIngredients] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data: stockOverview,
    isError: overviewIsError,
    isLoading: overviewLoading,
  } = useQuery({
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
        { ingredients: trimmed.split(',').map((s) => s.trim()).filter(Boolean) },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      setResult(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Analiz sırasında bir hata oluştu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Besin Değeri Analizi
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sahip olduğunuz malzemeleri virgülle ayırarak girin, yapay zeka besin değerlerini analiz etsin.
      </Typography>

      {(!overviewLoading && (stockOverview != null || overviewIsError)) && (
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <StockOverviewIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                Stok özeti (API)
              </Typography>
            </Stack>
            {overviewIsError && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Stok özeti yüklenemedi.
              </Alert>
            )}
            {stockOverview && (
              <Typography variant="body2" color="text.secondary">
                {stockOverview.total_product_kinds} çeşit ürün, toplam {stockOverview.total_units.toFixed(1)} birim.
                {stockOverview.item_names.length > 0 && (
                  <> Örnek: {stockOverview.item_names.slice(0, 8).join(', ')}
                  {stockOverview.item_names.length > 8 ? '…' : ''}.</>
                )}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Malzemeler"
          placeholder="örn: elma, yulaf, süt, yumurta"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <AnalyticsIcon />}
          sx={{ whiteSpace: 'nowrap', minWidth: 140 }}
        >
          {isLoading ? 'Analiz ediliyor…' : 'Analiz Et'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {result && (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            {result.analysis && (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
                {result.analysis}
              </Typography>
            )}

            {result.nutrition_info && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Besin Değerleri
                </Typography>
                <Grid container spacing={1}>
                  {Object.entries(result.nutrition_info).map(([key, value]) => (
                    <Grid item key={key}>
                      <Chip label={`${key}: ${value}`} size="small" variant="outlined" />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Öneriler
                </Typography>
                <Stack spacing={1}>
                  {result.recommendations.map((rec, i) => (
                    <Alert key={i} severity="info" sx={{ borderRadius: 2, py: 0.5 }}>
                      {rec}
                    </Alert>
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
