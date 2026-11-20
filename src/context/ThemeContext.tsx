import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GlobalTheme } from '../types/schema';
import { globalCourseStore } from '../store/courseStore';

export type ThemeMode = 'dark' | 'light' | 'custom';

export const DARK_THEME_DEFAULT: GlobalTheme = {
  primaryColor: '#2563eb',
  secondaryColor: '#4f46e5',
  accentColor: '#06b6d4',
  backgroundColor: '#0f172a',
  surfaceColor: '#1e293b',
  textColor: '#f8fafc',
  fontFamily: 'Inter, sans-serif',
  headingFontFamily: 'Inter, sans-serif',
  bodyFontFamily: 'Inter, sans-serif',
  typography: {
    headingSize: 32,
    subheadingSize: 22,
    bodySize: 16,
    lineHeight: 1.4,
  },
  spacing: {
    slideMargin: 40,
    elementGap: 16,
    cardPadding: 16,
    borderRadius: 12,
  },
  logoUrl: '',
  logoPosition: 'top-left',
};

export const LIGHT_THEME_DEFAULT: GlobalTheme = {
  primaryColor: '#0284c7',
  secondaryColor: '#0f766e',
  accentColor: '#38bdf8',
  backgroundColor: '#f8fafc',
  surfaceColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'Roboto, sans-serif',
  headingFontFamily: 'Roboto, sans-serif',
  bodyFontFamily: 'Roboto, sans-serif',
  typography: {
    headingSize: 32,
    subheadingSize: 22,
    bodySize: 16,
    lineHeight: 1.4,
  },
  spacing: {
    slideMargin: 40,
    elementGap: 16,
    cardPadding: 16,
    borderRadius: 12,
  },
  logoUrl: '',
  logoPosition: 'top-left',
};

export interface ThemeContextType {
  themeMode: ThemeMode;
  themeTokens: GlobalTheme;
  setThemeMode: (mode: ThemeMode) => void;
  updateThemeTokens: (
    tokens: GlobalTheme,
    options?: {
      applyBackgroundToPages?: boolean;
      applyLogoToPages?: boolean;
      applyTypographyToPages?: boolean;
      applySpacingToPages?: boolean;
    }
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
          return {
            ...DARK_THEME_DEFAULT,
            ...parsed,
            typography: {
              ...DARK_THEME_DEFAULT.typography,
              ...(parsed.typography || {}),
            },
            spacing: {
              ...DARK_THEME_DEFAULT.spacing,
              ...(parsed.spacing || {}),
            },
          };
        }
      }
    } catch {
      // ignore
    }
    return DARK_THEME_DEFAULT;
  });

  // Apply theme tokens to DOM root element & optionally cascade to global course store
  const applyDOMAndStore = (
    mode: ThemeMode,
    tokens: GlobalTheme,
    options?: {
      cascadeToPages?: boolean;
      applyBackgroundToPages?: boolean;
      applyLogoToPages?: boolean;
      applyTypographyToPages?: boolean;
      applySpacingToPages?: boolean;
    }
  ) => {
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
    root.style.setProperty('--surface-color', tokens.surfaceColor || '#1e293b');
    root.style.setProperty('--text-color', tokens.textColor || '#f8fafc');
    root.style.setProperty('--font-family', tokens.fontFamily || 'Inter, sans-serif');
    root.style.setProperty('--heading-font', tokens.headingFontFamily || tokens.fontFamily || 'Inter, sans-serif');
    root.style.setProperty('--body-font', tokens.bodyFontFamily || tokens.fontFamily || 'Inter, sans-serif');
    root.style.setProperty('--heading-size', `${tokens.typography?.headingSize ?? 32}px`);
    root.style.setProperty('--body-size', `${tokens.typography?.bodySize ?? 16}px`);
    root.style.setProperty('--slide-margin', `${tokens.spacing?.slideMargin ?? 40}px`);
    root.style.setProperty('--element-gap', `${tokens.spacing?.elementGap ?? 16}px`);
    root.style.setProperty('--card-padding', `${tokens.spacing?.cardPadding ?? 16}px`);
    root.style.setProperty('--border-radius', `${tokens.spacing?.borderRadius ?? 12}px`);

    if (options?.cascadeToPages) {
      globalCourseStore.applyGlobalTheme(tokens, {
        applyBackgroundToPages: options.applyBackgroundToPages ?? true,
        applyLogoToPages: options.applyLogoToPages ?? true,
        applyTypographyToPages: options.applyTypographyToPages ?? true,
        applySpacingToPages: options.applySpacingToPages ?? true,
      });
    }
  };

  // Sync state changes to localStorage and DOM CSS variables on mount or update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MODE, themeMode);
      localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(themeTokens));
    } catch {
      // ignore
    }

    applyDOMAndStore(themeMode, themeTokens, { cascadeToPages: false });
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
    applyDOMAndStore(mode, nextTokens, {
      cascadeToPages: true,
      applyBackgroundToPages: true,
      applyLogoToPages: true,
    });
  };

  const updateThemeTokens = (
    tokens: GlobalTheme,
    options?: {
      applyBackgroundToPages?: boolean;
      applyLogoToPages?: boolean;
      applyTypographyToPages?: boolean;
      applySpacingToPages?: boolean;
    }
  ) => {
    setThemeModeState('custom');
    setThemeTokensState(tokens);
    applyDOMAndStore('custom', tokens, {
      cascadeToPages: true,
      applyBackgroundToPages: options?.applyBackgroundToPages ?? true,
      applyLogoToPages: options?.applyLogoToPages ?? false,
      applyTypographyToPages: options?.applyTypographyToPages ?? true,
      applySpacingToPages: options?.applySpacingToPages ?? true,
    });
  };

  const resetTheme = () => {
    setThemeModeState('dark');
    setThemeTokensState(DARK_THEME_DEFAULT);
    applyDOMAndStore('dark', DARK_THEME_DEFAULT, {
      cascadeToPages: true,
      applyBackgroundToPages: true,
      applyLogoToPages: true,
      applyTypographyToPages: true,
      applySpacingToPages: true,
    });
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
