'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, Button, Slide, Stack } from '@mui/material'
import { WifiOff as WifiOffIcon, Wifi as WifiOnIcon, Refresh as RefreshIcon } from '@mui/icons-material'

export default function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(true)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 3000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setJustReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !justReconnected) return null

  return (
    <Slide direction="down" in mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          px: 3,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          bgcolor: isOnline ? '#065F46' : '#1F2937',
          color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {isOnline ? (
            <WifiOnIcon sx={{ color: '#34D399', fontSize: 22, flexShrink: 0 }} />
          ) : (
            <WifiOffIcon sx={{ color: '#F59E0B', fontSize: 22, flexShrink: 0 }} />
          )}
          <Box>
            <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
              {isOnline ? 'Bağlantı yeniden sağlandı' : 'İnternet bağlantısı yok'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
              {isOnline
                ? 'Sayfa otomatik olarak güncellenecek.'
                : 'Bağlantı sağlandığında devam edilecek.'}
            </Typography>
          </Box>
        </Stack>
        {!isOnline && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={() => window.location.reload()}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.4)',
              whiteSpace: 'nowrap',
              borderRadius: 2,
              fontWeight: 600,
              flexShrink: 0,
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            Yeniden Dene
          </Button>
        )}
      </Box>
    </Slide>
  )
}
