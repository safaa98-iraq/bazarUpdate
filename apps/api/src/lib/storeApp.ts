/**
 * Branded store app (Business plan only).
 *
 * Only the super admin creates / edits an app. The merchant can only:
 *  - ask for one ("requested"), and
 *  - choose whether download links are shown on their storefront ("showOnStore").
 */
export type StoreAppStatus = 'NONE' | 'REQUESTED' | 'IN_PROGRESS' | 'READY';
export const STORE_APP_STATUSES: StoreAppStatus[] = ['NONE', 'REQUESTED', 'IN_PROGRESS', 'READY'];

export interface StoreAppSettings {
  status: StoreAppStatus;
  requestedAt: string | null;
  /** Admin switch: the installable web app (manifest + install prompt) is live. */
  enabled: boolean;
  appName: string;
  shortName: string;
  icon: string | null;
  themeColor: string;
  installPrompt: boolean;
  androidUrl: string | null;
  iosUrl: string | null;
  /** Merchant switch: show "download our app" badges on the storefront. */
  showOnStore: boolean;
  adminNote: string | null;
}

type StoreLike = { name: string; logo: string | null; theme: string; appSettings: unknown };

export function rawAppSettings(store: { appSettings: unknown }): Record<string, unknown> {
  return (store.appSettings && typeof store.appSettings === 'object' ? store.appSettings : {}) as Record<string, unknown>;
}

export function readAppSettings(store: StoreLike): StoreAppSettings {
  const a = rawAppSettings(store);
  const s = (k: string) => (typeof a[k] === 'string' && (a[k] as string).trim() ? (a[k] as string) : null);
  let status = s('status') as StoreAppStatus | null;
  if (!status || !STORE_APP_STATUSES.includes(status)) {
    // Legacy field from the first version of this feature
    const legacy = s('nativeStatus');
    status = legacy === 'PUBLISHED' ? 'READY' : legacy === 'IN_REVIEW' ? 'IN_PROGRESS' : legacy === 'REQUESTED' ? 'REQUESTED' : 'NONE';
  }
  return {
    status,
    requestedAt: s('requestedAt') ?? s('nativeRequestedAt'),
    enabled: a.enabled === true && a.adminCreated === true,
    appName: s('appName') ?? store.name,
    shortName: s('shortName') ?? store.name.slice(0, 12),
    icon: s('icon') ?? store.logo ?? null,
    themeColor: s('themeColor') ?? (/^#[0-9a-fA-F]{6}$/.test(store.theme) ? store.theme : '#20A9F4'),
    installPrompt: a.installPrompt !== false,
    androidUrl: s('androidUrl'),
    iosUrl: s('iosUrl'),
    showOnStore: a.showOnStore === true,
    adminNote: s('adminNote'),
  };
}

/** Shape sent to the public storefront (null when there is nothing to show). */
export function publicAppSettings(store: StoreLike, plan: string) {
  if (plan !== 'ENTERPRISE') return null;
  const app = readAppSettings(store);
  const hasLinks = app.status === 'READY' && !!(app.androidUrl || app.iosUrl);
  if (!app.enabled && !hasLinks) return null;
  return {
    appName: app.appName,
    shortName: app.shortName,
    icon: app.icon,
    themeColor: app.themeColor,
    /** Web-app manifest + install banner only when the admin enabled it */
    pwa: app.enabled,
    installPrompt: app.enabled && app.installPrompt,
    androidUrl: app.status === 'READY' ? app.androidUrl : null,
    iosUrl: app.status === 'READY' ? app.iosUrl : null,
    showOnStore: app.showOnStore && hasLinks,
  };
}
