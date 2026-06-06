'use client'

import React, { useState, useEffect } from 'react'
import {
  AppBar, Toolbar, Typography, IconButton, Box, Drawer, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
  Avatar, Menu, MenuItem, Tooltip, useTheme, useMediaQuery, Badge, Chip,
} from '@mui/material'
import {
  Menu as MenuIcon, Close as CloseIcon,
  Dashboard as DashboardIcon, ShoppingCart as CartIcon,
  Inventory as StockIcon, Restaurant as RecipeIcon,
  Analytics as NutritionIcon, ShoppingBag as ShoppingListIcon,
  AdminPanelSettings as AdminIcon, Logout as LogoutIcon,
  LightMode as LightIcon, DarkMode as DarkIcon,
  SettingsBrightness as SystemIcon, AutoAwesome as SparkleIcon,
  EmojiEvents as DietIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getAuth, signOut } from 'firebase/auth'
import { app } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import { useRole } from '@/hooks/useRole'
import { useThemeMode } from '@/context/ThemeContext'
import { useCart } from '@/context/CartContext'
import { useQueryClient } from 'react-query'

const DRAWER_WIDTH = 260

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
  userOnly?: boolean
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <DashboardIcon fontSize="small" /> },
  { label: 'Ürünler', href: '/products', icon: <ShoppingListIcon fontSize="small" /> },
  { label: 'Sepet', href: '/cart', icon: <CartIcon fontSize="small" />, userOnly: true },
  { label: 'Stok', href: '/stock', icon: <StockIcon fontSize="small" />, userOnly: true },
  { label: 'Tarifler', href: '/recipes', icon: <RecipeIcon fontSize="small" />, userOnly: true },
  { label: 'Beslenme', href: '/nutrition', icon: <NutritionIcon fontSize="small" />, userOnly: true },
  { label: 'Diyet', href: '/preferences', icon: <DietIcon fontSize="small" />, userOnly: true },
  { label: 'Admin', href: '/admin', icon: <AdminIcon fontSize="small" />, adminOnly: true },
]

/** Glassmorphism tasarımlı responsive navigasyon çubuğu */
export default function Navbar() {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  const { mode, setMode } = useThemeMode()
  const queryClient = useQueryClient()
  const { totalCount } = useCart()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const pathname = usePathname()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)
  const [scrolled, setScrolled] = useState(false)

  // Kaydırma algılama — AppBar gölgesi için
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    setUserMenuAnchor(null)
    queryClient.clear()
    await signOut(getAuth(app))
    router.push('/login')
  }

  const handleThemeCycle = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = {
      light: 'dark', dark: 'system', system: 'light',
    }
    setMode(next[mode])
  }

  const ThemeIcon = mode === 'light' ? LightIcon : mode === 'dark' ? DarkIcon : SystemIcon
  const themeTooltip = mode === 'light' ? 'Koyu Tema' : mode === 'dark' ? 'Sistem Teması' : 'Açık Tema'

  const visibleItems = navItems.filter((item) =>
    (!item.adminOnly || isAdmin) && (!item.userOnly || !isAdmin)
  )
  const initials =
    user?.displayName?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Drawer header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SparkleIcon sx={{ fontSize: 18, color: '#fff' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} color="white">
            Market AI
          </Typography>
        </Box>
        <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ color: 'white' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Kullanıcı bilgisi */}
      {user && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {user.displayName || 'Kullanıcı'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Nav linkleri */}
      <List sx={{ flex: 1, pt: 1.5, px: 1.5 }}>
        {visibleItems.map((item) => {
          const active = pathname === item.href
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                selected={active}
                sx={{
                  borderRadius: 2.5,
                  py: 1.1,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&:hover': { background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' },
                  },
                  '&:not(.Mui-selected):hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38 }}>
                  {item.href === '/cart' && totalCount > 0
                    ? <Badge badgeContent={totalCount} color="error">{item.icon}</Badge>
                    : item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
                />
                {active && (
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255,255,255,0.8)',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      {/* Çıkış butonu */}
      <Box sx={{ p: 1.5 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2.5,
            color: 'error.main',
            '&:hover': { bgcolor: 'error.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } },
            transition: 'all 0.2s',
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Çıkış Yap" primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: scrolled
            ? theme.palette.mode === 'dark'
              ? 'rgba(19, 25, 41, 0.92)'
              : 'rgba(255, 255, 255, 0.92)'
            : 'background.paper',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: 1,
          borderColor: scrolled ? 'transparent' : 'divider',
          boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
          transition: 'all 0.25s ease',
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 60, sm: 64 } }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} size="small">
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Box
            component={Link}
            href="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              }}
            >
              <SparkleIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Market AI
            </Typography>
          </Box>

          {/* Desktop nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 3 }}>
              {visibleItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Box
                    key={item.href}
                    component={Link}
                    href={item.href}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 2,
                      fontSize: 13.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? 'primary.main' : 'text.secondary',
                      bgcolor: active ? 'primary.main' + '14' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      position: 'relative',
                      '&:hover': { bgcolor: 'action.hover', color: 'primary.main' },
                    }}
                  >
                    {item.href === '/cart' && totalCount > 0 ? (
                      <Badge badgeContent={totalCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, minWidth: 16, height: 16, fontWeight: 800 } }}>
                        {item.label}
                      </Badge>
                    ) : item.label}
                    {active && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 20,
                          height: 2.5,
                          borderRadius: 2,
                          background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                        }}
                      />
                    )}
                  </Box>
                )
              })}
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Tema değiştir */}
          <Tooltip title={themeTooltip}>
            <IconButton
              onClick={handleThemeCycle}
              size="small"
              sx={{
                bgcolor: 'action.hover',
                '&:hover': { bgcolor: 'action.selected' },
                borderRadius: 2,
              }}
            >
              <ThemeIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Avatar menüsü */}
          {user && (
            <>
              <Tooltip title={user.displayName || user.email || ''}>
                <IconButton
                  onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                  size="small"
                  sx={{ p: 0.25 }}
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      fontSize: 13,
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                    }}
                  >
                    {initials}
                  </Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    overflow: 'visible',
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {user.displayName || 'Kullanıcı'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem
                  onClick={handleLogout}
                  sx={{ gap: 1.5, color: 'error.main', mx: 0.5, borderRadius: 2, my: 0.5 }}
                >
                  <LogoutIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    Çıkış Yap
                  </Typography>
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: DRAWER_WIDTH, border: 'none' } }}
      >
        {drawerContent}
      </Drawer>

      <Toolbar sx={{ minHeight: { xs: 60, sm: 64 } }} />
    </>
  )
}
