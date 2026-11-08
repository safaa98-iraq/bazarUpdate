/** Branded store app settings (installable PWA + native build request). */
export interface StoreAppSettings {
  enabled: boolean;
  appName: string;
  shortName: string;
  icon: string | null;
  themeColor: string;
  installPrompt: boolean;
  nativeStatus: 'NONE' | 'REQUESTED' | 'IN_REVIEW' | 'PUBLISHED';
  nativePlatforms: string[];
  androidUrl: string | null;
  iosUrl: string | null;
}

export function readAppSettings(store: { name: string; logo: string | null; theme: string; appSettings: unknown }): StoreAppSettings {
  const a = (store.appSettings && typeof store.appSettings === 'object' ? store.appSettings : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof a[k] === 'string' && (a[k] as string).trim() ? (a[k] as string) : null);
  return {
    enabled: a.enabled !== false,
    appName: s('appName') ?? store.name,
    shortName: s('shortName') ?? store.name.slice(0, 12),
    icon: s('icon') ?? store.logo ?? null,
    themeColor: s('themeColor') ?? (/^#[0-9a-fA-F]{6}$/.test(store.theme) ? store.theme : '#20A9F4'),
    installPrompt: a.installPrompt !== false,
    nativeStatus: (s('nativeStatus') as StoreAppSettings['nativeStatus']) ?? 'NONE',
    nativePlatforms: Array.isArray(a.nativePlatforms) ? (a.nativePlatforms as string[]) : [],
    androidUrl: s('androidUrl'),
    iosUrl: s('iosUrl'),
  };
}
