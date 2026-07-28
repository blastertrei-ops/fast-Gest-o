import { CompanyThemeConfig } from '../types';

const THEME_PREF_KEY = 'fast_theme_preference';

export type ThemeMode = 'claro' | 'escuro' | 'sistema';

/**
 * Get current active theme mode
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'escuro';
  const saved = localStorage.getItem(THEME_PREF_KEY) as ThemeMode;
  return saved || 'escuro';
}

/**
 * Save and apply dark/light theme mode
 */
export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  localStorage.setItem(THEME_PREF_KEY, mode);

  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark = mode === 'escuro' || (mode === 'sistema' && prefersDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Apply custom company branding (Colors, Logo, Favicon)
 */
export function applyCompanyTheme(themeConfig?: CompanyThemeConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (!themeConfig) {
    // Reset to defaults
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--secondary-color');
    root.style.removeProperty('--button-color');
    return;
  }

  if (themeConfig.primaryColor) {
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
  }
  if (themeConfig.secondaryColor) {
    root.style.setProperty('--secondary-color', themeConfig.secondaryColor);
  }
  if (themeConfig.buttonColor) {
    root.style.setProperty('--button-color', themeConfig.buttonColor);
  }

  // Update favicon if custom favicon URL is provided
  if (themeConfig.faviconUrl) {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = themeConfig.faviconUrl;
  }

  // Apply dark mode preference if set in company config
  if (themeConfig.darkModePreference) {
    applyThemeMode(themeConfig.darkModePreference);
  }
}

/**
 * Get default company theme object
 */
export const DEFAULT_COMPANY_THEME: CompanyThemeConfig = {
  primaryColor: '#F59E0B', // Cor principal
  secondaryColor: '#FBBF24', // Cor de destaque
  buttonColor: '#F59E0B',
  menuColor: '#0F172A', // Fundo
  cardColor: '#1E293B', // Cards
  tagColor: '#334155',
  darkModePreference: 'escuro'
};
