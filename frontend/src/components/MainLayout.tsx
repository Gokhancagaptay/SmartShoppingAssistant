'use client'

import React from 'react'
import { Box } from '@mui/material'
import Navbar from '@/components/Navbar'
import GlobalAiAssistant from '@/components/GlobalAiAssistant'
import OfflineDetector from '@/components/OfflineDetector'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <OfflineDetector />
      <Navbar />
      <Box component="main" sx={{ flex: 1, py: 3 }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </Box>
      <GlobalAiAssistant />
    </Box>
  )
}
