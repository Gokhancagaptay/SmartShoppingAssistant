'use client'

import { Container, Typography, Paper } from '@mui/material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import StockOverview from '@/components/StockOverview'

/** Kullanıcı stok takip sayfası */
export default function StockPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={700} sx={{ mb: 4 }}>
            Stok Takibi
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <StockOverview />
          </Paper>
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
