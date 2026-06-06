'use client'

import { Container, Box, Typography, Chip } from '@mui/material'
import { Inventory2 as StockIcon } from '@mui/icons-material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import StockOverview from '@/components/StockOverview'

export default function StockPage() {
  return (
    <AuthGuard userOnly>
      <MainLayout>
        <Container maxWidth="md" sx={{ pb: 8 }}>
          {/* Hero */}
          <Box
            sx={{
              borderRadius: 4,
              background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0D9488 100%)',
              p: { xs: 3, sm: 4.5 },
              mb: 4,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -30, right: '20%', width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Chip
                icon={<StockIcon sx={{ fontSize: '14px !important', color: 'white !important' }} />}
                label="Kişisel Stok"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white', fontWeight: 700, mb: 2, fontSize: '0.72rem' }}
              />
              <Typography variant="h4" fontWeight={800} color="white" gutterBottom>
                Stok Takibi 📦
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.82)', maxWidth: 460, lineHeight: 1.6 }}>
                Sipariş ettiğiniz ve satın aldığınız ürünlerin stoğunu takip edin. Azalan ürünleri görün, miktarları güncelleyin.
              </Typography>
            </Box>
          </Box>

          <StockOverview />
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
