#!/usr/bin/env node
/**
 * Generate the Capacitor config for one store's native app.
 *
 *   node scripts/configure.mjs --slug my-store --site https://bazar.iq [--id iq.bazar.mystore]
 *
 * Reads the store's name and colour from the public store API and writes capacitor.config.json.
 * The app loads the live storefront, so product/price changes never need an app update.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const slug = args.slug;
const site = (args.site ?? 'https://bazar.iq').replace(/\/$/, '');
const api = (args.api ?? site.replace('://', '://api.')).replace(/\/$/, '');
if (!slug) { console.error('Usage: node scripts/configure.mjs --slug <store-slug> --site <https://site> [--api <https://api>] [--id <bundle.id>]'); process.exit(1); }

const res = await fetch(`${api}/api/storefront/${slug}`).catch(() => null);
const store = res?.ok ? (await res.json()).data : null;
if (!store) { console.error(`Store "${slug}" not found at ${api}`); process.exit(1); }
if (!store.app) { console.error('No app set up for this store yet: open Super Admin → تطبيقات المتاجر, fill in the app and tick the web-app (PWA) option first.'); process.exit(1); }

const appId = args.id ?? `iq.bazar.${slug.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'store'}`;
const config = {
  appId,
  appName: store.app.appName,
  webDir: 'www',
  server: {
    url: `${site}/store/${slug}?source=app`,
    allowNavigation: [new URL(site).host, new URL(api).host],
    androidScheme: 'https',
  },
  backgroundColor: '#ffffff',
  android: { allowMixedContent: false },
  ios: { contentInset: 'automatic' },
};
writeFileSync('capacitor.config.json', JSON.stringify(config, null, 2));
mkdirSync('www', { recursive: true });
writeFileSync('www/index.html', `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${config.server.url}"><title>${store.app.appName}</title>`);
console.log(`✓ ${appId} — "${store.app.appName}" → ${config.server.url}`);
console.log(`  Icon (1024px for the stores): ${site}/store/${slug}/app-icon/512`);
console.log('  Next: npm run android   (or npm run ios on a Mac with Xcode)');
