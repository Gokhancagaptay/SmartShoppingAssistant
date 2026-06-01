'use client'

import { Container, Box, Typography, Chip } from '@mui/material'
import { AutoAwesome as AIIcon } from '@mui/icons-material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import RecipeSuggestions from '@/components/RecipeSuggestions'

export default function RecipesPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="md" sx={{ pb: 8 }}>
          {/* Hero */}
          <Box
            sx={{
              borderRadius: 4,
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
              p: { xs: 3, sm: 4.5 },
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{
              position: 'absolute', top: -50, right: -50,
              width: 180, height: 180, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              pointerEvents: 'none',
            }} />
            <Box sx={{
              position: 'absolute', bottom: -35, right: '18%',
              width: 120, height: 120, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                icon={<AIIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
                label="Gemini AI Destekli"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, mb: 2, fontSize: '0.72rem' }}
              />
              <Typography variant="h4" fontWeight={800} color="white" gutterBottom>
                Tarif Önerileri 🍽️
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 500, lineHeight: 1.6 }}>
                Stoğunuzdaki malzemelere göre kahvaltı, öğle ve akşam için kişiselleştirilmiş AI tarifleri alın. Tarifi yapınca stoğunuz otomatik güncellenir.
              </Typography>
            </Box>
          </Box>

          <RecipeSuggestions />
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
