'use client'

import { Container, Box, Typography, Chip } from '@mui/material'
import { Analytics as AnalyticsIcon } from '@mui/icons-material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import NutritionAnalysis from '@/components/NutritionAnalysis'

export default function NutritionPage() {
  return (
    <AuthGuard userOnly>
      <MainLayout>
        <Container maxWidth="md" sx={{ pb: 8 }}>
          {/* Hero */}
          <Box
            sx={{
              borderRadius: 4,
              background: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #0D9488 100%)',
              p: { xs: 3, sm: 4.5 },
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -30, right: '18%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                icon={<AnalyticsIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
                label="AI Destekli"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 700, mb: 2, fontSize: '0.72rem' }}
              />
              <Typography variant="h4" fontWeight={800} color="white" gutterBottom>
                Beslenme Analizi 🥗
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 480, lineHeight: 1.6 }}>
                Stoğunuzdaki veya tükettiğiniz malzemelerin besin değerlerini yapay zeka ile analiz edin. Eksikliklerinizi keşfedin.
              </Typography>
            </Box>
          </Box>

          <NutritionAnalysis />
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
