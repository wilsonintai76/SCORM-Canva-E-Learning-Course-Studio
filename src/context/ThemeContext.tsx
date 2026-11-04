import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GlobalTheme } from '../types/schema';
import { globalCourseStore } from '../store/courseStore';

export type ThemeMode = 'dark' | 'light' | 'custom';

export const DARK_THEME_DEFAULT: GlobalTheme = {
  primaryColor: '#2563eb',
  secondaryColor: '#4f46e5',
  accentColor: '#06b6d4',
  backgroundColor: '#0f172a',
  fontFamily: 'Inter, sans-serif',
  headingFontFamily: 'Inter, sans-serif',
  bodyFontFamily: 'Inter, sans-serif',
  logoUrl: '',
  logoPosition: 'top-left',
};

export const LIGHT_THEME_DEFAULT: GlobalTheme = {
  primaryColor: '#0284c7',
  secondaryColor: '#0f766e',
  accentColor: '#38bdf8',
  backgroundColor: '#f8fafc',
  fontFamily: 'Roboto, sans-serif',
  headingFontFamily: 'Roboto, sans-serif',
  bodyFontFamily: 'Roboto, sans-serif',
  logoUrl: '',
  logoPosition: 'top-left',
};

export interface ThemeContextType {
  themeMode: ThemeMode;
  themeTokens: GlobalTheme;
  setThemeMode: (mode: ThemeMode) => void;
  updateThemeTokens: (
    tokens: GlobalTheme,
    options?: { applyBackgroundToPages?: boolean; applyLogoToPages?: boolean }
  ) => void;
  resetTheme: () => void;
}

const STORAGE_KEY_MODE = 'scorm_canva_theme_mode';
const STORAGE_KEY_TOKENS = 'scorm_canva_global_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
      if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'custom') {
        return savedMode;
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [themeTokens, setThemeTokensState] = useState<GlobalTheme>(() => {
    try {
      const savedTokens = localStorage.getItem(STORAGE_KEY_TOKENS);
      if (savedTokens) {
        const parsed = JSON.parse(savedTokens);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DARK_THEME_DEFAULT;
  });

  // Apply theme tokens to DOM root element & sync with global course store
  const applyDOMAndStore = (mode: ThemeMode, tokens: GlobalTheme, cascadeToPages = false) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (mode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('dark', 'light');
    }

    // Set CSS custom properties on root for instant visual cascade
    root.style.setProperty('--primary-color', tokens.primaryColor);
    root.style.setProperty('--secondary-color', tokens.secondaryColor);
    root.style.setProperty('--accent-color', tokens.accentColor);
    root.style.setProperty('--bg-color', tokens.backgroundColor);
    root.style.setProperty('--font-family', tokens.fontFamily || 'Inter, sans-serif');

    // Sync with globalCourseStore so canvas elements update immediately
    globalCourseStore.applyGlobalTheme(tokens, {
      applyBackgroundToPages: cascadeToPages,
      applyLogoToPages: true,
    });
  };

  // Sync state changes to localStorage and DOM on mount or state update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODE, themeMode);
      localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(themeTokens));
    } catch {
      // ignore
    }

    applyDOMAndStore(themeMode, themeTokens, false);
  }, [themeMode, themeTokens]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    let nextTokens = themeTokens;
    if (mode === 'dark') {
      nextTokens = DARK_THEME_DEFAULT;
    } else if (mode === 'light') {
      nextTokens = LIGHT_THEME_DEFAULT;
    }
    setThemeTokensState(nextTokens);
    applyDOMAndStore(mode, nextTokens, true);
  };

  const updateThemeTokens = (
    tokens: GlobalTheme,
    options?: { applyBackgroundToPages?: boolean; applyLogoToPages?: boolean }
  ) => {
    setThemeModeState('custom');
    setThemeTokensState(tokens);
    applyDOMAndStore('custom', tokens, options?.applyBackgroundToPages ?? true);
  };

  const resetTheme = () => {
    setThemeModeState('dark');
    setThemeTokensState(DARK_THEME_DEFAULT);
    applyDOMAndStore('dark', DARK_THEME_DEFAULT, true);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        themeTokens,
        setThemeMode,
        updateThemeTokens,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
