'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Box,
  Fab,
  Zoom,
  Drawer,
  Typography,
  IconButton,
  TextField,
  Stack,
  Paper,
  CircularProgress,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  AutoAwesome as SparkleIcon,
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useDietaryPreferences } from '@/hooks/useDietaryPreferences'
import { useAiChat, type AiChatMessage } from '@/hooks/useAiChat'

const QUICK = [
  'Sepetim ve stokum için bugün ne pişirebilirim?',
  'Diyet hedeflerime uygun atıştırmalık öner.',
  'Son kullanma yaklaşan ürünleri nasıl değerlendirebilirim?',
]

/** Tüm sayfalardan erişilen AI sohbet çekmecesi (sepet + stok bağlamı). */
export default function GlobalAiAssistant() {
  const theme = useTheme()
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))
  const pathname = usePathname()
  const { items, totalCount } = useCart()
  const { buildDietaryContext } = useDietaryPreferences()
  const { postQuestion, isAsking, setIsAsking } = useAiChat()

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      role: 'ai',
      text: 'Merhaba! Sepetiniz ve (varsa) bağlamınızla ilgili sorularınızı yanıtlamaya hazırım.',
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (pathname === '/login' || pathname === '/register' || pathname === '/cart') return null

  const stockItems = items.map((i) => i.name)
  const cartLine =
    totalCount > 0
      ? `Sepetimde şu ürünler var: ${items.map((i) => `${i.name} x${i.quantity}`).join(', ')}.${buildDietaryContext()}`
      : `Sepetim şu an boş. Genel alışveriş ve mutfak konusunda yardım istiyorum.${buildDietaryContext()}`

  const send = async (q: string) => {
    const text = q.trim()
    if (!text || isAsking) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setIsAsking(true)
    setMessages((m) => [...m, { role: 'ai', text: '', loading: true }])
    try {
      const answer = await postQuestion({
        question: text,
        stockItems: stockItems,
        cartContext: cartLine,
      })
      setMessages((m) => [
        ...m.filter((x) => !x.loading),
        { role: 'ai', text: answer },
      ])
    } catch {
      setMessages((m) => [
        ...m.filter((x) => !x.loading),
        { role: 'ai', text: 'Şu an yanıt veremiyorum. Lütfen tekrar deneyin.' },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  const drawerWidth = isMdUp ? 420 : '100%'

  return (
    <>
      <Zoom in>
        <Fab
          color="primary"
          aria-label="AI asistan"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: theme.zIndex.speedDial,
            boxShadow: theme.shadows[8],
          }}
        >
          <SparkleIcon />
        </Fab>
      </Zoom>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: drawerWidth } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700}>
              AI Asistan
            </Typography>
            <IconButton onClick={() => setOpen(false)} aria-label="Kapat">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ mb: 1.5, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: '92%',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'action.hover',
                    color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {msg.loading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">Düşünüyorum…</Typography>
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </Typography>
                  )}
                </Paper>
              </Box>
            ))}
            <div ref={endRef} />
          </Box>

          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
              {QUICK.map((q) => (
                <Chip key={q} size="small" label={q} onClick={() => send(q)} disabled={isAsking} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder="Sorunuzu yazın…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send(input)}
                disabled={isAsking}
              />
              <IconButton color="primary" onClick={() => send(input)} disabled={isAsking} aria-label="Gönder">
                {isAsking ? <CircularProgress size={22} /> : <SendIcon />}
              </IconButton>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
