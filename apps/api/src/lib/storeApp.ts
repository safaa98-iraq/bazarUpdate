/**
 * Branded store app (Business plan only).
 *
 * Only the super admin creates the app and uploads its files (Android APK / iPhone IPA).
 * The files are stored in the database (StoreAppBuild) and downloaded straight from
 * Bazar — nothing is published on Google Play or the App Store.
 *
 * The merchant can only:
 *  - ask for an app ("requested"), and
 *  - choose whether download buttons are shown on their storefront ("showOnStore").
 */
export type StoreAppStatus = 'NONE' | 'REQUESTED' | 'IN_PROGRESS' | 'READY';
export const STORE_APP_STATUSES: StoreAppStatus[] = ['NONE', 'REQUESTED', 'IN_PROGRESS', 'READY'];
export type AppPlatform = 'android' | 'ios';
export const APP_PLATFORMS: AppPlatform[] = ['android', 'ios'];

/** Metadata of an uploaded build, mirrored into Store.appSettings so reads need no extra query. */
export interface AppBuildMeta { fileName: string; version: string; size: number; uploadedAt: string; bundleId?: string | null }

export interface StoreAppSettings {
  status: StoreAppStatus;
  requestedAt: string | null;
  /** Admin switch: installable web app (iPhone "Add to Home Screen" + Android install prompt). */
  enabled: boolean;
  appName: string;
  shortName: string;
  icon: string | null;
  themeColor: string;
  installPrompt: boolean;
  builds: { android: AppBuildMeta | null; ios: AppBuildMeta | null };
  /** Merchant switch: show "download our app" buttons on the storefront. */
  showOnStore: boolean;
  adminNote: string | null;
}

type StoreLike = { name: string; logo: string | null; theme: string; appSettings: unknown };

export function rawAppSettings(store: { appSettings: unknown }): Record<string, unknown> {
  return (store.appSettings && typeof store.appSettings === 'object' ? store.appSettings : {}) as Record<string, unknown>;
}

function buildMeta(v: unknown): AppBuildMeta | null {
  if (!v || typeof v !== 'object') return null;
  const b = v as Record<string, unknown>;
  return typeof b.fileName === 'string' && typeof b.size === 'number'
    ? { fileName: b.fileName, version: String(b.version ?? '1.0.0'), size: b.size, uploadedAt: String(b.uploadedAt ?? ''), bundleId: (b.bundleId as string) ?? null }
    : null;
}

export function readAppSettings(store: StoreLike): StoreAppSettings {
  const a = rawAppSettings(store);
  const s = (k: string) => (typeof a[k] === 'string' && (a[k] as string).trim() ? (a[k] as string) : null);
  let status = s('status') as StoreAppStatus | null;
  if (!status || !STORE_APP_STATUSES.includes(status)) {
    const legacy = s('nativeStatus');
    status = legacy === 'PUBLISHED' ? 'READY' : legacy === 'IN_REVIEW' ? 'IN_PROGRESS' : legacy === 'REQUESTED' ? 'REQUESTED' : 'NONE';
  }
  const builds = (a.builds && typeof a.builds === 'object' ? a.builds : {}) as Record<string, unknown>;
  return {
    status,
    requestedAt: s('requestedAt') ?? s('nativeRequestedAt'),
    enabled: a.enabled === true && a.adminCreated === true,
    appName: s('appName') ?? store.name,
    shortName: s('shortName') ?? store.name.slice(0, 12),
    icon: s('icon') ?? store.logo ?? null,
    themeColor: s('themeColor') ?? (/^#[0-9a-fA-F]{6}$/.test(store.theme) ? store.theme : '#20A9F4'),
    installPrompt: a.installPrompt !== false,
    builds: { android: buildMeta(builds.android), ios: buildMeta(builds.ios) },
    showOnStore: a.showOnStore === true,
    adminNote: s('adminNote'),
  };
}

/** True when a customer can actually get the app on at least one platform. */
export function hasDownloads(app: StoreAppSettings) {
  return !!(app.builds.android || app.builds.ios || app.enabled);
}

/** Shape sent to the public storefront (null when there is nothing to show). */
export function publicAppSettings(store: StoreLike, plan: string) {
  if (plan !== 'ENTERPRISE') return null;
  const app = readAppSettings(store);
  const ready = app.status === 'READY' && hasDownloads(app);
  if (!app.enabled && !ready) return null;
  const pub = (b: AppBuildMeta | null) => (ready && b ? { version: b.version, size: b.size } : null);
  return {
    appName: app.appName,
    shortName: app.shortName,
    icon: app.icon,
    themeColor: app.themeColor,
    /** Web-app manifest + install banner (also the iPhone fallback) */
    pwa: app.enabled,
    installPrompt: app.enabled && app.installPrompt,
    ready,
    android: pub(app.builds.android),
    ios: pub(app.builds.ios),
    showOnStore: app.showOnStore && ready,
  };
}
