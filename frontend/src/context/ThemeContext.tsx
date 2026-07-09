import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Temas del rediseño "Artesanal Sobrio":
//  - paper: claro "Cuaderno técnico"
//  - slate: oscuro "Pizarra sobria"
export type ArtisanTheme = 'paper' | 'slate';

const STORAGE_KEY = 'pool-theme';

const readInitialTheme = (): ArtisanTheme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'paper' || stored === 'slate') return stored;
  } catch {
    // localStorage puede no estar disponible (SSR/privacidad)
  }
  return 'paper';
};

interface ThemeContextValue {
  theme: ArtisanTheme;
  setTheme: (theme: ArtisanTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'paper',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ArtisanTheme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // sin persistencia, el tema igual aplica en esta sesión
    }
  }, [theme]);

  const setTheme = useCallback((next: ArtisanTheme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'paper' ? 'slate' : 'paper')), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
