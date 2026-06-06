'use client'

import React from 'react'
import { Box, Typography, Button, Avatar } from '@mui/material'
import { WarningAmber as WarnIcon, Refresh as RefreshIcon } from '@mui/icons-material'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: 2.5,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: 'error.main',
              mx: 'auto',
            }}
          >
            <WarnIcon sx={{ fontSize: 36 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Beklenmeyen bir hata oluştu
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: 3 }}>
              {this.state.error?.message || 'Sayfayı yenilemek sorunu çözebilir.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={this.handleReset}
            sx={{ borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
          >
            Sayfayı Yenile
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
