import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'loop_theme_preference'
const VALID_THEMES = ['auto', 'light', 'dark']

const ThemeContext = createContext(null)

function getStoredPreference() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return VALID_THEMES.includes(raw) ? raw : 'auto'
  } catch {
    return 'auto'
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyThemeToDocument(resolvedTheme) {
  const root = document.documentElement
  root.setAttribute('data-theme', resolvedTheme)
  root.style.colorScheme = resolvedTheme
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreferenceState] = useState(() => getStoredPreference())
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme())

  const resolvedTheme = themePreference === 'auto' ? systemTheme : themePreference

  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')

    function handleSystemChange(event) {
      setSystemTheme(event.matches ? 'light' : 'dark')
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [])

  function setThemePreference(nextTheme) {
    if (!VALID_THEMES.includes(nextTheme)) return
    setThemePreferenceState(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Sin persistencia si el navegador bloquea localStorage
    }
  }

  const value = useMemo(
    () => ({
      themePreference,
      resolvedTheme,
      systemTheme,
      setThemePreference
    }),
    [themePreference, resolvedTheme, systemTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }
  return context
}
