'use client'

import { Container, Typography, Paper } from '@mui/material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import RecipeSuggestions from '@/components/RecipeSuggestions'

/** Tarif önerileri sayfası */
export default function RecipesPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
            Tarif Önerileri
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <RecipeSuggestions />
          </Paper>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
