# Bazar store app (Android / iOS)

Every Bazar store on the Business plan is already an **installable app** (PWA): customers tap
"ثبّت التطبيق" on Android, or Share → "Add to Home Screen" on iPhone. That works today with no store review.

This folder turns a store into a **native app for Google Play / the App Store** when a merchant asks
for it from *لوحة التاجر ← تطبيق المتجر ← «نعم، أريد تطبيقاً»*. Only the super admin creates the app
(*لوحة الأدمن ← تطبيقات المتاجر*): fill the name/icon/colour, build with this kit, then paste the
Google Play / App Store links and set the status to «منشور» — the merchant then sees the download buttons.

The native app is a thin [Capacitor](https://capacitorjs.com) shell around the live storefront, so the merchant
never needs to publish an update when they change products or prices.

## Build one store's app

```bash
cd mobile
npm install
node scripts/configure.mjs --slug demo-store --site https://bazarupdate.onrender.com --api https://bazarupdate-api.onrender.com
npm run android      # opens Android Studio → Build → Generate Signed Bundle (.aab)
npm run ios          # macOS + Xcode only → Product → Archive
```

App icon: download `https://<site>/store/<slug>/app-icon/512` and set it with Android Studio's
*Image Asset* tool / Xcode's *AppIcon* set.

## Publishing checklist
- Google Play developer account (one-time $25) — upload the signed `.aab`.
- Apple developer account ($99/year) — Apple rejects pure "website wrappers", so publish iOS only for
  stores with enough native value (push notifications are the usual next step) or keep iPhone users on the PWA.
- Privacy policy URL, screenshots, short/long description in Arabic.

> ⚠️ This kit has not been built in CI (it needs Android Studio / Xcode). Build once by hand and keep the signing keys safe.
