// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MERCHANT' | 'CUSTOMER' | 'STAFF';
  storeId?: string;
  permissions?: string[];
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
}

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

export interface PlanConfig {
  key: PlanKey;
  nameAr: string;
  price: number;
  priceIQD: number;
  firstYearDiscountPercent?: number;
  firstYearPriceIQD?: number;
  products: number;
  categories: number;
  /** -1 = unlimited, 0 = not available on this plan */
  maxCoupons: number;
  /** -1 = unlimited, 0 = not available on this plan */
  maxBrands: number;
  /** -1 = unlimited */
  maxBanners: number;
  features: string[];
  badge?: string;
  subtitle?: string;
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

export const PLAN_CONFIGS: Record<PlanKey, PlanConfig> = {
  FREE: {
    key: 'FREE',
    nameAr: 'المجانية',
    price: 0,
    priceIQD: 0,
    products: 55,
    categories: 3,
    maxCoupons: 0,
    maxBrands: 0,
    maxBanners: 1,
    subtitle: 'للبدء',
    features: ['55 منتج', '3 تصنيفات', 'متجر عام', 'دعم أساسي'],
  },
  PRO: {
    key: 'PRO',
    nameAr: 'الاحترافية',
    price: 19,
    priceIQD: 60000,
    firstYearDiscountPercent: 18,
    firstYearPriceIQD: 49200,
    products: -1,
    categories: 20,
    maxCoupons: 1,
    maxBrands: 5,
    maxBanners: 5,
    badge: 'الأكثر طلباً',
    subtitle: 'للنمو',
    features: ['منتجات غير محدودة', '20 تصنيف', 'تحليلات متقدمة', 'أولوية دعم', 'كود خصم واحد', '5 ماركات'],
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    nameAr: 'الأعمال',
    price: 49,
    priceIQD: 100000,
    firstYearDiscountPercent: 25,
    firstYearPriceIQD: 75000,
    products: -1,
    categories: -1,
    maxCoupons: 5,
    maxBrands: -1,
    maxBanners: -1,
    subtitle: 'للتوسع',
    features: ['كل مميزات الاحترافية', 'تقارير Excel تلقائية', 'نطاق مخصص', '5 أكواد خصم', 'ماركات غير محدودة', 'التعليق على المنتجات'],
  },
};

export const PLAN_COMPARISON: PlanComparisonRow[] = [
  { label: 'إنشاء متجر إلكتروني', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'عدد المنتجات', FREE: '55', PRO: 'غير محدود', ENTERPRISE: 'غير محدود' },
  { label: 'تعديل تصميم المتجر', sub: 'عدد مرات حفظ التصميم', FREE: '4 مرات', PRO: 'غير محدود', ENTERPRISE: 'غير محدود' },
  { label: 'التصنيفات', FREE: '3', PRO: '20', ENTERPRISE: 'غير محدود' },
  { label: 'رابط المتجر (bazar.iq/store)', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'نطاق مخصص', sub: 'مثل: myshop.com', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'تخصيص شكل المتجر', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'بانرات ترويجية', sub: 'بصور قابلة للضغط', FREE: '1', PRO: '5', ENTERPRISE: 'غير محدود' },
  { label: 'أقسام فيديو مضمّن', sub: 'يوتيوب أو رابط فيديو مباشر', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'قوالب تصميم متعددة', FREE: '1', PRO: '5+', ENTERPRISE: '5+' },
  { label: 'رفع صور المنتجات', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'كوبونات الخصم', FREE: false, PRO: 'كود واحد', ENTERPRISE: '5 أكواد' },
  { label: 'الماركات التجارية', FREE: false, PRO: '5 ماركات', ENTERPRISE: 'غير محدود' },
  { label: 'تقييمات المنتجات', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'التعليق على المنتجات', FREE: false, PRO: false, ENTERPRISE: true },
  { label: 'المسوقون بالعمولة', sub: 'تتبع المبيعات عبر روابط خاصة', FREE: false, PRO: '10 مسوق', ENTERPRISE: 'غير محدود' },
  { label: 'إشعارات الطلبات', FREE: true, PRO: true, ENTERPRISE: true },
  { label: 'تحليلات المتجر', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'دعم عبر الواتساب', FREE: false, PRO: true, ENTERPRISE: true },
  { label: 'مشاركة السلة', sub: 'رابط سلة قابل للمشاركة مع العملاء', FREE: false, PRO: true, ENTERPRISE: true },
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
