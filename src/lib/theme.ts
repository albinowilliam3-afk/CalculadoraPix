export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'color-scheme';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemePreference(): ThemePreference {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'light' || val === 'dark') return val;
  } catch {
    // Ignore storage access errors
  }
  return 'system';
}

export function resolveTheme(pref: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return pref === 'system' ? systemTheme : pref;
}

export function applyThemeMeta(pref: ThemePreference, systemTheme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const metaScheme = document.querySelector('meta[name="color-scheme"]');
  if (metaScheme) {
    metaScheme.setAttribute('content', pref === 'system' ? 'light dark' : pref);
  }

  const resolved = resolveTheme(pref, systemTheme);
  const themeColor = resolved === 'dark' ? '#0B0E17' : '#F5F7FB';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute('media');
    meta.setAttribute('content', themeColor);
  });
}

/**
 * Modern Web Guidance (`dark-mode-toggle`) two-state toggle:
 * Alterna para o oposto do tema atualmente renderizado; se coincidir com o padrão do sistema,
 * limpa o localStorage para voltar a seguir o sistema sem travar invisivelmente.
 */
export function computeNextToggledPreference(
  currentPref: ThemePreference,
  systemTheme: ResolvedTheme
): ThemePreference {
  const currentRendered = resolveTheme(currentPref, systemTheme);
  const target: ResolvedTheme = currentRendered === 'dark' ? 'light' : 'dark';
  return target === systemTheme ? 'system' : target;
}

export function persistThemePreference(pref: ThemePreference): void {
  try {
    if (pref === 'system') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, pref);
    }
  } catch {
    // Ignore storage access errors
  }
}
