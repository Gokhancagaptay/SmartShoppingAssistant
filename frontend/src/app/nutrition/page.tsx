'use client'

import { Container, Typography, Paper } from '@mui/material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import NutritionAnalysis from '@/components/NutritionAnalysis'

/** Beslenme analizi sayfası */
export default function NutritionPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
            Beslenme Analizi
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <NutritionAnalysis />
          </Paper>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
