// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MERCHANT' | 'CUSTOMER' | 'STAFF';
  storeId?: string;
  permissions?: string[];
  /** Set when a store staff member (not the owner) is signed in. userId is then the store owner's id. */
  staffId?: string;
  /** Branch the staff member is restricted to, if any. */
  warehouseId?: string | null;
  iat?: number;
  exp?: number;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  referralCode?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MERCHANT' | 'CUSTOMER';
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  isActive: boolean;
  referralCode?: string | null;
  createdAt: string;
  /** Present when the signed-in person is a staff member of the store. */
  staff?: StaffSession | null;
}

/* ─── Staff & permissions ─────────────────────────────────────────────── */

export type StaffPermission =
  | 'orders' | 'products' | 'marketing' | 'design' | 'chat' | 'reports' | 'settings' | 'branches';

export const STAFF_PERMISSIONS: { key: StaffPermission; label: string; hint: string }[] = [
  { key: 'orders',    label: 'الطلبات والشحن',      hint: 'عرض الطلبات وتحديث حالتها، التأكيد عبر واتساب، البوالص' },
  { key: 'products',  label: 'المنتجات والمخزون',   hint: 'إضافة وتعديل المنتجات والتصنيفات والماركات' },
  { key: 'marketing', label: 'التسويق',            hint: 'الكوبونات، العروض، بطاقات الهدايا، المسوقون' },
  { key: 'design',    label: 'تصميم المتجر',        hint: 'محرر الشكل والبانرات' },
  { key: 'chat',      label: 'رسائل العملاء',       hint: 'الرد على محادثات الزبائن' },
  { key: 'reports',   label: 'التقارير',            hint: 'المبيعات والتحليلات' },
  { key: 'branches',  label: 'الفروع والمخازن',     hint: 'إدارة الفروع وتوزيع المخزون' },
  { key: 'settings',  label: 'إعدادات المتجر',      hint: 'التوصيل، واتساب، اللغات' },
];

export type StaffRolePreset = 'manager' | 'orders' | 'products' | 'branch' | 'custom';

export const STAFF_ROLE_PRESETS: Record<StaffRolePreset, { label: string; permissions: StaffPermission[] }> = {
  manager:  { label: 'مدير المتجر',     permissions: ['orders', 'products', 'marketing', 'design', 'chat', 'reports', 'branches', 'settings'] },
  orders:   { label: 'موظف طلبات',      permissions: ['orders', 'chat'] },
  products: { label: 'موظف منتجات',     permissions: ['products'] },
  branch:   { label: 'مسؤول فرع',       permissions: ['orders', 'products'] },
  custom:   { label: 'صلاحيات مخصصة',   permissions: [] },
};

export interface StaffSession {
  id: string;
  name: string;
  role: StaffRolePreset;
  permissions: StaffPermission[];
  warehouseId: string | null;
}

export interface StaffMemberPublic extends StaffSession {
  email: string;
  isActive: boolean;
  warehouseName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/* ─── Branches / warehouses ───────────────────────────────────────────── */

export interface WarehousePublic {
  id: string;
  name: string;
  governorate: string | null;
  address: string | null;
  phone: string | null;
  servesGovernorates: string[];
  isDefault: boolean;
  isActive: boolean;
  totalUnits: number;
  ordersCount: number;
}

/* ─── Shipments ───────────────────────────────────────────────────────── */

export type ShipmentStatus = 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED: 'تم إنشاء البوليصة',
  PICKED_UP: 'استلمها المندوب',
  IN_TRANSIT: 'في الطريق',
  OUT_FOR_DELIVERY: 'خرجت للتوصيل',
  DELIVERED: 'تم التسليم',
  RETURNED: 'راجع للمتجر',
  CANCELLED: 'ملغاة',
};

export interface ShipmentEvent { status: ShipmentStatus; at: string; note?: string }

export interface ShipmentPublic {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string | null;
  trackingCode: string;
  status: ShipmentStatus;
  events: ShipmentEvent[];
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export type OrderConfirmationStatus = 'NONE' | 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface CreateStoreDto {
  name: string;
  slug: string;
  description?: string;
  theme?: string;
  template?: string;
}

export interface StoreSocialLinks {
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  tiktok?: string;
  snapchat?: string;
  deliveryPartners?: string[];
}

export const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'السليمانية',
  'ديالى', 'الأنبار', 'بابل', 'واسط', 'ذي قار', 'المثنى', 'القادسية',
  'صلاح الدين', 'كركوك', 'ميسان', 'دهوك',
] as const;

export type IraqiGovernorate = typeof IRAQI_GOVERNORATES[number];

export interface StoreDeliveryZone {
  governorate: string;
  price: number;
}

export const FREE_PLAN_BUILDER_EDIT_LIMIT = 4;

export interface UpdateStoreDto {
  name?: string;
  description?: string;
  logo?: string;
  theme?: string;
  template?: string;
  isPublished?: boolean;
  builderConfig?: string;
  storeType?: string;
  currency?: string;
  socialLinks?: StoreSocialLinks;
  deliveryZones?: StoreDeliveryZone[];
  customDomain?: string | null;
  defaultSizeGuide?: string | null;
}

export type StoreType = 'general' | 'fashion' | 'electronics' | 'food' | 'gaming' | 'beauty' | 'sports' | 'kids' | 'books' | 'furniture';

export interface StoreTypeConfig {
  id: StoreType;
  label: string;
  icon: string;
  description: string;
  unitOptions: { value: string; label: string }[];
  defaultUnit: string;
  themeColor: string;
  templateHint: string;
}

export type PlanKey = 'FREE' | 'PRO' | 'ENTERPRISE';

export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'LIFETIME';
export const BILLING_CYCLES: BillingCycle[] = ['LIFETIME', 'YEARLY', 'MONTHLY'];
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = { MONTHLY: 'شهري', YEARLY: 'سنوي', LIFETIME: 'أبدي' };
/** Days a paid period lasts (lifetime never expires). */
export const BILLING_CYCLE_DAYS: Record<Exclude<BillingCycle, 'LIFETIME'>, number> = { MONTHLY: 30, YEARLY: 365 };

/** -1 = unlimited, 0 = not available on this plan. */
export interface PlanConfig {
  key: PlanKey;
  nameAr: string;
  /** Monthly price in USD (reference only, sold in IQD). */
  price: number;
  /** Monthly price in IQD. */
  priceIQD: number;
  /** IQD price per billing cycle (paid plans). */
  prices: Record<BillingCycle, number>;
  products: number;
  ordersPerMonth: number;
  categories: number;
  maxCoupons: number;
  maxBrands: number;
  maxBanners: number;
  maxAffiliates: number;
  maxStaff: number;
  maxBranches: number;
  /** Number of store templates available (-1 = all). */
  templates: number;
  /** Outcome-first sales headline + who it is for (pricing page). */
  headline: string;
  audience: string;
  cta: string;
  features: string[];
  badge?: string;
  subtitle?: string;
  support: string;
}

export interface PlanComparisonRow {
  label: string;
  sub?: string;
  FREE: boolean | string | null;
  PRO: boolean | string | null;
  ENTERPRISE: boolean | string | null;
  highlight?: boolean;
}

export const PLAN_ORDER: PlanKey[] = ['FREE', 'PRO', 'ENTERPRISE'];

/** Days of the Business-plan trial every new merchant gets. */
export const TRIAL_DAYS = 14;
/** Lifetime deals are limited to the first N merchants. */
export const LIFETIME_SEATS = 100;
/** Lifetime can be paid in this many installments (within 60 days). */
export const LIFETIME_INSTALLMENTS = 3;
/** Merchants who subscribed before the 2026-11 pricing get this % off lifetime. */
export const LEGACY_LIFETIME_DISCOUNT_PERCENT = 10;
/** Payment refund window (days). */
export const REFUND_DAYS = 14;

export const PLAN_CONFIGS: Record<PlanKey, PlanConfig> = {
  FREE: {
    key: 'FREE',
    nameAr: 'المجانية',
    price: 0,
    priceIQD: 0,
    prices: { MONTHLY: 0, YEARLY: 0, LIFETIME: 0 },
    products: 30,
    ordersPerMonth: 50,
    categories: 3,
    maxCoupons: 1,
    maxBrands: 0,
    maxBanners: 1,
    maxAffiliates: 0,
    maxStaff: 0,
    maxBranches: 0,
    templates: 1,
    headline: 'ابدأ متجرك اليوم بدون مبرمج وبدون تكلفة',
    audience: 'تاجر يجرّب البيع أونلاين لأول مرة',
    cta: 'ابدأ مجاناً',
    subtitle: 'للبدء',
    support: 'مركز المساعدة',
    features: ['30 منتجاً', '50 طلباً شهرياً', '3 تصنيفات', 'قالب واحد', 'كود خصم واحد', 'الدفع عند الاستلام وطباعة البوالص'],
  },
  PRO: {
    key: 'PRO',
    nameAr: 'الاحترافية',
    price: 14,
    priceIQD: 22000,
    prices: { MONTHLY: 22000, YEARLY: 189000, LIFETIME: 499000 },
    products: -1,
    ordersPerMonth: -1,
    categories: 20,
    maxCoupons: 10,
    maxBrands: 5,
    maxBanners: 5,
    maxAffiliates: 3,
    maxStaff: 0,
    maxBranches: 0,
    templates: -1,
    badge: 'الأكثر اختياراً',
    headline: 'بِع أكثر، وقلّل الطلبات الراجعة',
    audience: 'تاجر انستغرام أو واتساب تصله طلبات يومية',
    cta: 'ابدأ البيع الاحترافي',
    subtitle: 'للنمو',
    support: 'واتساب',
    features: [
      'منتجات وطلبات غير محدودة',
      'تأكيد الطلب عبر واتساب قبل الشحن',
      'ربط شركة التوصيل وتتبع تلقائي',
      'السلال المتروكة ومراسلتها على واتساب',
      'المحادثة مع الزبائن داخل المتجر',
      'العروض التلقائية و10 أكواد خصم و3 مؤثرين',
      'كل القوالب والأقسام المتقدمة',
    ],
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    nameAr: 'الأعمال',
    price: 26,
    priceIQD: 39000,
    prices: { MONTHLY: 39000, YEARLY: 389000, LIFETIME: 1090000 },
    products: -1,
    ordersPerMonth: -1,
    categories: -1,
    maxCoupons: -1,
    maxBrands: -1,
    maxBanners: -1,
    maxAffiliates: -1,
    maxStaff: 5,
    maxBranches: 3,
    templates: -1,
    headline: 'متجرك باسمك ودومينك، وفريقك يديره معك',
    audience: 'متجر بفريق أو فروع أو علامة تجارية معروفة',
    cta: 'نمِّ علامتك',
    subtitle: 'للتوسع',
    support: 'واتساب بأولوية',
    features: [
      'كل ميزات الاحترافية',
      'دومين خاص بدون «مدعوم بـ بازار»',
      '5 موظفين بصلاحيات محددة',
      '3 فروع ومخازن وتوجيه الطلب للأقرب',
      'واجهة المتجر بالكردية',
      'تأكيد واتساب تلقائي (API) وبطاقات هدايا',
      'قسم الفيديو، أكواد ومؤثرون بلا حد',
    ],
  },
};

/** Whole-dinar savings of yearly vs. 12 monthly payments. */
export function yearlySavingIQD(plan: PlanKey): number {
  const p = PLAN_CONFIGS[plan].prices;
  return Math.max(0, p.MONTHLY * 12 - p.YEARLY);
}

/**
 * Price per day for the pricing page: monthly → an upper bound rounded up to 50 IQD
 * ("less than 750 a day"), yearly → rounded to the nearest 10 IQD ("about 520 a day").
 */
export function perDayIQD(plan: PlanKey, cycle: 'MONTHLY' | 'YEARLY'): number {
  const p = PLAN_CONFIGS[plan].prices;
  if (cycle === 'MONTHLY') return Math.ceil((p.MONTHLY / 30 + 1) / 50) * 50;
  return Math.round(p.YEARLY / 365 / 10) * 10;
}

export const PLAN_COMPARISON: PlanComparisonRow[] = [
  { label: 'المنتجات', FREE: '30', PRO: 'غير محدود', ENTERPRISE: 'غير محدود' },
  { label: 'الطلبات شهرياً', FREE: '50', PRO: 'غير محدود', ENTERPRISE: 'غير محدود' },
  { label: 'التصنيفات', FREE: '3', PRO: '20', ENTERPRISE: 'غير محدود' },
  { label: 'القوالب', FREE: '1', PRO: 'كل القوالب', ENTERPRISE: 'كل القوالب' },
  { label: 'حفظ تصميم المتجر', FREE: '4 مرات', PRO: 'غير محدود', ENTERPRISE: 'غير محدود' },
  { label: 'الأقسام المتقدمة', sub: 'آراء، معرض، ماركات', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'قسم الفيديو', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'البانرات', FREE: '1', PRO: '5', ENTERPRISE: 'غير محدود' },
  { label: 'أكواد الخصم', FREE: '1', PRO: '10', ENTERPRISE: 'غير محدود' },
  { label: 'العروض التلقائية', sub: 'اشترِ X واحصل على Y', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'بطاقات الهدايا', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'المسوقون بالعمولة', FREE: false, PRO: '3', ENTERPRISE: 'غير محدود' },
  { label: 'السلال المتروكة', FREE: 'عددها فقط', PRO: 'القائمة + مراسلة واتساب', ENTERPRISE: 'القائمة + مراسلة واتساب' },
  { label: 'تأكيد الطلب قبل الشحن', FREE: false, PRO: 'يدوي عبر واتساب', ENTERPRISE: 'يدوي + تلقائي (API)', highlight: true },
  { label: 'الربط مع شركة التوصيل', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'المحادثة مع العملاء', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'التقييم بالنجوم', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'التعليق النصي على المنتجات', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'التحليلات', FREE: 'عدد الطلبات فقط', PRO: 'المؤشرات الأربعة', ENTERPRISE: 'المؤشرات الأربعة' },
  { label: 'عبارة «مدعوم بـ بازار»', FREE: 'ظاهرة', PRO: 'ظاهرة', ENTERPRISE: 'تُزال' },
  { label: 'نطاق خاص (دومين)', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'واجهة بالكردية', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'حسابات الموظفين', FREE: false, PRO: false, ENTERPRISE: '5' },
  { label: 'الفروع والمخازن', FREE: false, PRO: false, ENTERPRISE: '3' },
  { label: 'الدعم', FREE: 'مركز المساعدة', PRO: 'واتساب', ENTERPRISE: 'واتساب بأولوية' },
];

/** Extras that depend on how long the merchant pays for (paid plans). */
export const CYCLE_PERKS: { label: string; MONTHLY: string; YEARLY: string; LIFETIME: string }[] = [
  { label: 'تثبيت السعر', MONTHLY: 'لا', YEARLY: 'طوال السنة', LIFETIME: 'دائم' },
  { label: 'تصميم المتجر بواسطة فريق بازار', MONTHLY: 'لا', YEARLY: 'الأعمال فقط', LIFETIME: 'الباقتان' },
  { label: 'رفع المنتجات نيابةً عن التاجر', MONTHLY: 'لا', YEARLY: 'لا', LIFETIME: 'حتى 100 منتج' },
  { label: 'أشهر الإحالة المجانية', MONTHLY: 'نعم', YEARLY: 'نعم', LIFETIME: '—' },
];

export interface CategoryPublic {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt?: string;
}

export interface ProductSpecValuePublic {
  value: string;
  image?: string;
}

export interface ProductSpecPublic {
  name: string;
  values: ProductSpecValuePublic[];
}

export interface BrandPublic {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  image: string | null;
  createdAt: string;
  productCount?: number;
}

export interface CreateBrandDto {
  name: string;
  image?: string;
}

export interface ProductReviewPublic {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string | null;
  images: string[];
  merchantReply: string | null;
  merchantReplyAt: string | null;
  createdAt: string;
}

export interface CreateProductReviewDto {
  customerName: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface ProductPublic {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  stock: number;
  categoryId: string | null;
  brandId?: string | null;
  modelNumber?: string | null;
  isActive: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoSlug?: string | null;
  unit?: string;
  unitLabel?: string;
  createdAt: string;
  category?: CategoryPublic | { id: string; storeId: string; name: string; slug: string } | null;
  brand?: { id: string; name: string; slug: string; image: string | null } | null;
  specs?: ProductSpecPublic[];
  avgRating?: number;
  reviewCount?: number;
  hasVariants?: boolean;
  saleEndsAt?: string | null;
  sizeGuide?: string | null;
  isNew?: boolean;
  isBestSeller?: boolean;
  variants?: ProductVariantPublic[];
  lowStockThreshold?: number | null;
  isLowStock?: boolean;
  wholesaleTiers?: WholesaleTierPublic[];
}

export interface StorePublic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  theme: string;
  template: string;
  isActive: boolean;
  isPublished: boolean;
  builderConfig?: string | null;
  storeType: string;
  currency: string;
  socialLinks?: StoreSocialLinks;
  deliveryZones?: StoreDeliveryZone[];
  builderEditCount?: number;
  customDomain?: string | null;
  customDomainVerified?: boolean;
  defaultSizeGuide?: string | null;
  createdAt: string;
  merchant?: { id: string; name: string; email: string; plan: string };
}

export interface ProductAttributePublic {
  id: string;
  storeId: string;
  name: string;
  kind: string;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
}

export interface ProductAttributeValuePublic {
  id: string;
  productId: string;
  attributeId: string;
  value: string;
  attribute?: ProductAttributePublic;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  stock: number;
  categoryId?: string;
  brandId?: string | null;
  images?: string[];
  isActive?: boolean;
  unit?: string;
  unitType?: string;
  unitLabel?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoSlug?: string;
  hasVariants?: boolean;
  saleEndsAt?: string | null;
  sizeGuide?: string | null;
  lowStockThreshold?: number | null;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface WholesaleTierPublic {
  id: string;
  productId: string;
  minQty: number;
  price: number;
}

export interface CreateWholesaleTierDto {
  minQty: number;
  price: number;
}

export interface ProductVariantPublic {
  id: string;
  productId: string;
  options: Record<string, string>;
  sku: string | null;
  price: number | null;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface CreateVariantDto {
  options: Record<string, string>;
  sku?: string;
  price?: number | null;
  stock: number;
  imageUrl?: string;
  isActive?: boolean;
}

export type OrderStatusType = 'DRAFT' | 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface CreateOrderDto {
  storeId: string;
  customerEmail?: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: Record<string, unknown>;
  shippingFee?: number;
  stripePaymentId?: string;
  isDraft?: boolean;
  draftNote?: string;
  giftCardCode?: string;
  couponCode?: string;
  items: Array<{ productId: string; quantity: number; variantId?: string }>;
}

export interface OrderPublic {
  id: string;
  storeId: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string | null;
  total: number;
  shippingFee: number;
  status: OrderStatusType;
  shippingAddress: Record<string, unknown>;
  stripePaymentId: string | null;
  draftNote?: string | null;
  confirmationStatus?: OrderConfirmationStatus;
  confirmationToken?: string | null;
  confirmationSentAt?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  shipment?: Pick<ShipmentPublic, 'trackingCode' | 'trackingNumber' | 'status' | 'carrier'> | null;
  createdAt: string;
  items: Array<{ id: string; productId: string; variantId?: string | null; variantLabel?: string | null; quantity: number; price: number; product?: { name: string; images: string[]; specs?: ProductSpecPublic[] } }>;
  store?: { name: string; slug: string };
}

export interface GiftCardPublic {
  id: string;
  storeId: string;
  code: string;
  initialValue: number;
  remainingBalance: number;
  isActive: boolean;
  expiresAt: string | null;
  purchaserEmail: string | null;
  recipientEmail: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateGiftCardDto {
  initialValue: number;
  expiresAt?: string | null;
  purchaserEmail?: string;
  recipientEmail?: string;
  note?: string;
}

export interface PromotionPublic {
  id: string;
  storeId: string;
  type: 'BOGO' | 'TIERED';
  name: string;
  isActive: boolean;
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';
  targetIds: string[];
  config: Record<string, unknown>;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export interface CreatePromotionDto {
  type: 'BOGO' | 'TIERED';
  name: string;
  isActive?: boolean;
  scope?: 'ALL' | 'CATEGORY' | 'PRODUCT';
  targetIds?: string[];
  config: Record<string, unknown>;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface LoyaltyRulePublic {
  id: string;
  storeId: string | null;
  storeName: string | null;
  eventType: string;
  pointsPerUnit: number;
  multiplier: number;
  minOrderAmount: number | null;
  isActive: boolean;
}

export interface LoyaltyAccountPublic {
  id: string;
  customerEmail: string;
  totalPoints: number;
  lifetimePoints: number;
  tier: string;
}

export interface LoyaltyAnalytics {
  totalAccounts: number;
  totalPointsOutstanding: number;
  totalPointsEverEarned: number;
  tiers: { PLATINUM: number; GOLD: number; SILVER: number; BRONZE: number };
  totalEarned: number;
  totalRedeemed: number;
  totalBonus: number;
}

export type AdminActionType = 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SUSPEND' | 'ACTIVATE' | 'PLAN_CHANGE' | string;

export interface StoreComparisonRow {
  storeId: string;
  storeName: string;
  slug: string;
  merchantName: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  productCount: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  growthPercent: number | null;
  topCategory: string | null;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalMerchants: number;
  activeMerchants: number;
  inactiveMerchants: number;
  totalStores: number;
  activeStores: number;
  newMerchantsThisMonth: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  topStores: TopStore[];
}

export interface TopStore {
  id?: string;
  name?: string;
  storeId?: string;
  storeName?: string;
  slug?: string;
  revenue?: number;
  orders?: number;
  views?: number;
  totalRevenue?: number;
  totalOrders?: number;
  [key: string]: unknown;
}

export interface CreateCouponDto {
  code: string;
  label?: string | null;
  affiliateId?: string | null;
  discountType: 'percent' | 'fixed' | string;
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  expiresAt?: string;
  isActive?: boolean;
}

export interface CouponPublic {
  id: string;
  storeId: string;
  code: string;
  label?: string | null;
  affiliateId?: string | null;
  discountType: 'percent' | 'fixed' | string;
  discountValue: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ApplyCouponResult {
  coupon: CouponPublic;
  discountAmount: number;
  finalTotal: number;
}

export interface AffiliatePublic {
  id: string;
  storeId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  platform?: string | null;
  handle?: string | null;
  followerCount?: number | null;
  commissionType: 'percent' | 'fixed';
  commissionRate: number;
  totalEarned: number;
  totalOrders: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  conversions?: number;
  couponCode?: string | null;
}

export interface ConversationPublic {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string | null;
  assignedTo: string | null;
  status: 'open' | 'resolved' | 'pending';
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount?: number;
}

export interface ChatMessagePublic {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'agent';
  senderName: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface QuickReplyPublic {
  id: string;
  storeId: string;
  title: string;
  body: string;
}

export interface AICredits {
  used: number;
  limit: number;
  remaining: number;
}

export interface WidgetStat {
  storeId: string;
  storeName: string;
  slug: string;
  widgetEnabled: boolean;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  categoryId: string | null;
  viewCount: number;
}

// ─── Blog / Articles ─────────────────────────────────────────────────────────

export interface ArticlePublic {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  author?: { name: string };
}

export interface UpsertArticleDto {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  isPublished?: boolean;
}

// ─── Custom domain ───────────────────────────────────────────────────────────

export interface CustomDomainStatus {
  domain: string | null;
  verified: boolean;
}

// ─── Merchant referrals ──────────────────────────────────────────────────────

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  freeMonthsCredit: number;
  referrals: { name: string; plan: PlanKey; joinedAt: string; rewardGiven: boolean }[];
}

// ─── Admin: merchant health signals ──────────────────────────────────────────

export type MerchantIssueType = 'NO_STORE' | 'NO_PRODUCTS' | 'NO_SALES' | 'SUSPENDED' | 'PAYMENT_PENDING';

export interface MerchantIssue {
  merchantId: string;
  merchantName: string;
  merchantEmail: string;
  merchantWhatsapp: string | null;
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  issueType: MerchantIssueType;
  detail: string;
  since: string;
}
