'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material'

interface ToastOptions {
  duration?: number
}

interface ToastContextValue {
  success: (msg: string, opts?: ToastOptions) => void
  error:   (msg: string, opts?: ToastOptions) => void
  info:    (msg: string, opts?: ToastOptions) => void
  warning: (msg: string, opts?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

interface ToastState {
  open: boolean
  message: string
  severity: AlertColor
  duration: number
}

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="up" />
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    open: false, message: '', severity: 'info', duration: 3500,
  })

  const show = useCallback((message: string, severity: AlertColor, duration = 3500) => {
    setState({ open: true, message, severity, duration })
  }, [])

  const value: ToastContextValue = {
    success: (msg, opts) => show(msg, 'success', opts?.duration),
    error:   (msg, opts) => show(msg, 'error',   opts?.duration ?? 5000),
    info:    (msg, opts) => show(msg, 'info',    opts?.duration),
    warning: (msg, opts) => show(msg, 'warning', opts?.duration),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={state.duration}
        onClose={() => setState(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={SlideUp}
        sx={{ mb: { xs: 2, sm: 3 } }}
      >
        <Alert
          severity={state.severity}
          variant="filled"
          onClose={() => setState(s => ({ ...s, open: false }))}
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 260,
          }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
