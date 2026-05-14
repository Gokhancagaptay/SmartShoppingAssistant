'use client'

import { Box } from '@mui/material'
import Navbar from '@/components/Navbar'
import GlobalAiAssistant from '@/components/GlobalAiAssistant'

/** Navbar + içerik alanını saran genel sayfa düzeni bileşeni */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Navbar />
      <Box component="main" sx={{ flex: 1, py: 3 }}>
        {children}
      </Box>
      <GlobalAiAssistant />
    </Box>
  )
}
