# Bazar store app (Android / iOS)

Every Bazar store on the Business plan is already an **installable app** (PWA): customers tap
"ثبّت التطبيق" on Android, or Share → "Add to Home Screen" on iPhone. That works today with no store review.

This folder turns a store into a **native Android/iPhone app file** when a merchant asks
for it from *لوحة التاجر ← تطبيق المتجر ← «نعم، أريد تطبيقاً»*. Only the super admin creates the app
(*لوحة الأدمن ← تطبيقات المتاجر*): fill the name/icon/colour, build the APK (and optionally a signed IPA)
with this kit, **upload the file on that page** — it is stored in the database (`StoreAppBuild`) and
downloaded directly from Bazar, nothing is published on Google Play / the App Store — then set the
status to «جاهز». The merchant and their customers then get the download buttons.

The native app is a thin [Capacitor](https://capacitorjs.com) shell around the live storefront, so the merchant
never needs to publish an update when they change products or prices.

## Build one store's app

```bash
cd mobile
npm install
node scripts/configure.mjs --slug demo-store --site https://bazarupdate.onrender.com --api https://bazarupdate-api.onrender.com
npm run android      # opens Android Studio → Build → Generate Signed Bundle / APK → APK
npm run ios          # macOS + Xcode only → Product → Archive → Distribute (Enterprise / Ad Hoc) → .ipa
```

App icon: download `https://<site>/store/<slug>/app-icon/512` and set it with Android Studio's
*Image Asset* tool / Xcode's *AppIcon* set.

## Delivering the files (no app stores)
- **Android**: build a *signed APK* and upload it in *تطبيقات المتاجر*. Customers download it from the
  store's `/app` page and allow "install from this source" once.
- **iPhone**: Apple only allows direct installs of an IPA signed with an **Enterprise** certificate or an
  **Ad Hoc** profile (registered devices only). Upload such an IPA with its Bundle ID and customers get an
  over-the-air install link. Without one, keep the web-app option on — iPhone customers then install the
  store with Safari → Share → «إضافة إلى الشاشة الرئيسية».
- Keep the signing keys safe: every update must be signed with the same key or Android refuses to upgrade.

> ⚠️ This kit has not been built in CI (it needs Android Studio / Xcode). Build once by hand and keep the signing keys safe.
