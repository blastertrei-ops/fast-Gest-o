import { CompanyThemeConfig } from '../types';

const THEME_PREF_KEY = 'fast_theme_preference';

export type ThemeMode = 'claro' | 'escuro' | 'sistema';

/**
 * Get current active theme mode
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'claro';
  const saved = localStorage.getItem(THEME_PREF_KEY) as ThemeMode;
  return saved || 'claro';
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
 * Default company theme object (Light Corporate theme)
 */
export const DEFAULT_COMPANY_THEME: CompanyThemeConfig = {
  primaryColor: '#0066FF',   // Azul Principal Fast Gestão (#0066FF)
  secondaryColor: '#00A3FF', // Azul Secundário / Gradiente (#00A3FF)
  buttonColor: '#F59E0B',    // Laranja Ações Principais (#F59E0B)
  menuColor: '#132238',      // Sidebar Azul Escuro Corporativo
  cardColor: '#FFFFFF',      // Cards Branco
  tagColor: '#E5E7EB',
  darkModePreference: 'claro'
};

