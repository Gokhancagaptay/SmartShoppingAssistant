'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import CssBaseline from '@mui/material/CssBaseline'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import { AppThemeProvider } from '@/context/ThemeContext'
import { CartProvider } from '@/context/CartContext'
import { ToastProvider } from '@/context/ToastContext'
import { FavoritesProvider } from '@/context/FavoritesContext'

/**
 * Uygulamanın tüm global sağlayıcılarını tek bir bileşende toplar.
 * - AppRouterCacheProvider: MUI + Next.js App Router önbellekleme
 * - QueryClientProvider:    react-query veri önbellekleme
 * - AppThemeProvider:       MUI light/dark tema + sistem tercihi
 * - CssBaseline:            MUI sıfırlama stilleri
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient'ı state içinde tutarak her render'da yeniden oluşturulmasını önlüyoruz.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Pencere odak değişiminde otomatik yenilemeyi kapat
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      })
  )

  return (
    <AppRouterCacheProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <CartProvider>
            <FavoritesProvider>
              <ToastProvider>
                <CssBaseline />
                {children}
              </ToastProvider>
            </FavoritesProvider>
          </CartProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </AppRouterCacheProvider>
  )
}
