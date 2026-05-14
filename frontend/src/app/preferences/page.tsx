'use client'

import React, { useState, useEffect } from 'react'
import {
  Box, Container, Typography, Chip, TextField, Button,
  Stack, Paper, Alert, CircularProgress, Divider, Tooltip,
  useTheme, alpha,
} from '@mui/material'
import {
  Restaurant as FoodIcon,
  Check as CheckIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  RestaurantMenu as RecipeIcon,
} from '@mui/icons-material'
import AuthGuard from '@/components/AuthGuard'
import MainLayout from '@/components/MainLayout'
import { useDietaryPreferences, DietaryPreferences } from '@/hooks/useDietaryPreferences'

/** Önceden tanımlı diyet etiketleri — emoji + label + açıklama */
const DIET_TAGS = [
  { id: 'vejetaryen', label: 'Vejetaryen', emoji: '🥗', desc: 'Et tüketmiyorum' },
  { id: 'vegan', label: 'Vegan', emoji: '🌱', desc: 'Hayvansal ürün tüketmiyorum' },
  { id: 'glutensiz', label: 'Glütensiz', emoji: '🌾', desc: 'Buğday/glüten kullanmıyorum' },
  { id: 'düşük karbonhidrat', label: 'Düşük Karbonhidrat', emoji: '🥩', desc: 'Karbonhidratı kısıtlıyorum' },
  { id: 'ketojenik', label: 'Ketojenik', emoji: '🫙', desc: 'Yüksek yağ, çok düşük karbonhidrat' },
  { id: 'paleo', label: 'Paleo', emoji: '🦴', desc: 'İşlenmiş gıda yemiyorum' },
  { id: 'düşük yağ', label: 'Düşük Yağ', emoji: '🫐', desc: 'Yağ alımımı kısıtlıyorum' },
  { id: 'laktoz intoleranı', label: 'Laktoz İntoleranı', emoji: '🥛', desc: 'Süt ürünü tüketemiyorum' },
  { id: 'diyabetik', label: 'Diyabetik', emoji: '💉', desc: 'Şeker ve glisemik indeks önemli' },
  { id: 'yüksek protein', label: 'Yüksek Protein', emoji: '💪', desc: 'Protein alımını artırmak istiyorum' },
  { id: 'düşük sodyum', label: 'Düşük Sodyum', emoji: '🧂', desc: 'Tuzu kısıtlıyorum' },
  { id: 'intermittent fasting', label: 'Aralıklı Oruç', emoji: '⏱️', desc: 'Belirli saatlerde yiyorum' },
]

export default function PreferencesPage() {
  const theme = useTheme()
  const { preferences, loading, saving, error, savePreferences } = useDietaryPreferences()

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [localError, setLocalError] = useState('')

  // Tercihler yüklenince formu doldur
  useEffect(() => {
    if (!loading) {
      setSelectedTags(preferences.tags ?? [])
      setCustomNote(preferences.custom_note ?? '')
    }
  }, [loading, preferences])

  const toggleTag = (id: string) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setLocalError('')
    setSuccessMsg('')
    const prefs: DietaryPreferences = {
      tags: selectedTags,
      custom_note: customNote.trim(),
    }
    try {
      await savePreferences(prefs)
      setSuccessMsg('Tercihleriniz kaydedildi! Tarif önerileri artık diyetinize göre kişiselleştirilecek.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch {
      setLocalError('Tercihler kaydedilemedi, lütfen tekrar deneyin.')
    }
  }

  const isDirty =
    JSON.stringify(selectedTags.slice().sort()) !==
      JSON.stringify((preferences.tags ?? []).slice().sort()) ||
    customNote.trim() !== (preferences.custom_note ?? '').trim()

  const gradientBg =
    theme.palette.mode === 'dark'
      ? `linear-gradient(135deg, ${alpha('#7C3AED', 0.18)} 0%, ${alpha('#EC4899', 0.12)} 100%)`
      : `linear-gradient(135deg, ${alpha('#7C3AED', 0.08)} 0%, ${alpha('#EC4899', 0.06)} 100%)`

  return (
    <AuthGuard>
      <MainLayout>
        <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
          {/* ── Başlık ── */}
          <Box
            sx={{
              background: gradientBg,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 4,
              p: { xs: 3, md: 4 },
              mb: 4,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)`,
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                🥗
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Diyet Tercihlerim
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tercihleriniz tarif önerilerini kişiselleştirmek için kullanılır
                </Typography>
              </Box>
            </Stack>
          </Box>

          {loading ? (
            <Box textAlign="center" py={6}>
              <CircularProgress color="secondary" />
              <Typography mt={2} color="text.secondary">
                Tercihler yükleniyor…
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {/* ── Diyet etiketleri ── */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                  <RecipeIcon color="secondary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    Diyet Türünü Seçin
                  </Typography>
                  <Tooltip title="Birden fazla seçebilirsiniz" arrow>
                    <InfoIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                  </Tooltip>
                </Stack>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {DIET_TAGS.map(tag => {
                    const selected = selectedTags.includes(tag.id)
                    return (
                      <Tooltip key={tag.id} title={tag.desc} arrow placement="top">
                        <Chip
                          label={
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <span>{tag.emoji}</span>
                              <span>{tag.label}</span>
                            </Stack>
                          }
                          onClick={() => toggleTag(tag.id)}
                          icon={selected ? <CheckIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            px: 0.5,
                            height: 38,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            ...(selected
                              ? {
                                  background: `linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)`,
                                  color: '#fff',
                                  boxShadow: `0 4px 14px ${alpha('#7C3AED', 0.4)}`,
                                  '& .MuiChip-icon': { color: '#fff' },
                                }
                              : {
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  color: theme.palette.text.primary,
                                  border: `2px solid ${alpha(theme.palette.primary.main, 0.45)}`,
                                  '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                                    borderColor: theme.palette.primary.main,
                                    transform: 'translateY(-1px)',
                                  },
                                }),
                          }}
                        />
                      </Tooltip>
                    )
                  })}
                </Box>

                {selectedTags.length > 0 && (
                  <Box
                    mt={2.5}
                    p={1.5}
                    borderRadius={2}
                    sx={{ bgcolor: alpha('#7C3AED', 0.07), border: `1px solid ${alpha('#7C3AED', 0.2)}` }}
                  >
                    <Typography variant="caption" color="secondary.main" fontWeight={600}>
                      Seçilen: {selectedTags.join(' · ')}
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* ── Özel not ── */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} mb={0.5}>
                  Ek Notlar & Kısıtlamalar
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Listelenmemiş alerjilerinizi, kısıtlamalarınızı veya özel isteklerinizi yazın.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder='Örn: "Fıstığa alerjim var, acılı yemekler istemiyorum, az tuzlu tercih ederim."'
                  value={customNote}
                  onChange={e => setCustomNote(e.target.value)}
                  inputProps={{ maxLength: 400 }}
                  helperText={`${customNote.length}/400`}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': { borderColor: 'secondary.main' },
                      '&.Mui-focused fieldset': { borderColor: 'secondary.main' },
                    },
                  }}
                />
              </Paper>

              {/* ── Nasıl kullanılır? ── */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: alpha(theme.palette.info.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ fontSize: 22 }}>💡</Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="info.main" mb={0.5}>
                      Bu tercihler nasıl kullanılır?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
                      Stoğunuzdaki ürünler analiz edilirken AI, diyet tercihlerinizi göz önünde bulundurur.
                      "Düşük karbonhidrat" seçtiyseniz ekmek bazlı tarifler yerine protein ağırlıklı öneriler sunar.
                      Sepet danışmanı da tercihlerinizi bilerek yanıt verir.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* ── Hata / Başarı mesajları ── */}
              {(error || localError) && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error ?? localError}
                </Alert>
              )}
              {successMsg && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  {successMsg}
                </Alert>
              )}

              {/* ── Kaydet butonu ── */}
              <Divider />
              <Box display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  disabled={saving || !isDirty}
                  onClick={handleSave}
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    background: isDirty
                      ? `linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)`
                      : undefined,
                    boxShadow: isDirty ? `0 6px 20px ${alpha('#7C3AED', 0.4)}` : undefined,
                    '&:hover': {
                      background: `linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)`,
                    },
                  }}
                >
                  {saving ? 'Kaydediliyor…' : 'Tercihleri Kaydet'}
                </Button>
              </Box>
            </Stack>
          )}
        </Container>
      </MainLayout>
    </AuthGuard>
  )
}
