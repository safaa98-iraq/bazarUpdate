/**
 * Landing-page content that the team edits without touching the page layout.
 *
 * - Change an image: drop the new file in /public/images/... and update its path here.
 * - Change the copy of a store-type tab: edit title / description / bullets below.
 * - Add or remove a business logo: edit BRAND_LOGOS (files live in /public/images/logos).
 *
 * ⚠️ The logos below are FICTIONAL placeholder brands, and the numbers in
 * PLATFORM_STATS are placeholders too. Replace both with real merchants (with
 * their permission) and real figures before launch.
 */
import type { ClayIconName } from '@/components/ui/ClayIcon';

/* ─── Business logos (hero badges + "شركاء النجاح") ───────────────────────── */

export interface BrandLogo {
  name: string;
  /** Wide logo used in the partners strip. */
  logo: string;
  /** Square mark used in the round hero badges. */
  mark: string;
}

const logo = (slug: string, name: string): BrandLogo => ({
  name,
  logo: `/images/logos/${slug}.svg`,
  mark: `/images/logos/${slug}-mark.svg`,
});

export const BRAND_LOGOS: BrandLogo[] = [
  logo('dar-alward', 'دار الورد'),
  logo('sumer', 'عطور سومر'),
  logo('tigris-tech', 'Tigris Tech'),
  logo('bin-alsabah', 'بُن الصباح'),
  logo('lamar', 'LAMAR'),
  logo('babel-kids', 'Babel Kids'),
  logo('areej', 'حلويات أريج'),
  logo('zaha-home', 'زها هوم'),
  logo('nakhla', 'نخلة'),
  logo('nour-optics', 'Nour Optics'),
  logo('ofuq', 'كتب أفق'),
  logo('maya-beauty', 'Maya Beauty'),
];

/** How many logos to show as round badges in the hero. */
export const HERO_LOGO_COUNT = 8;

/* ─── Platform numbers (placeholders) ─────────────────────────────────────── */

export const HERO_BADGE_TEXT = 'متجر إلكتروني نشط في العراق';

export const PLATFORM_STATS: { value: string; label: string; icon: ClayIconName }[] = [
  { value: '+1,200', label: 'متجر إلكتروني نشط', icon: 'store' },
  { value: '+250,000', label: 'طلب تمت معالجته', icon: 'cart' },
  { value: '18', label: 'محافظة يصلها التوصيل', icon: 'truck' },
];

/* ─── Store-type tabs ─────────────────────────────────────────────────────── */

export interface StoreTypeShowcase {
  /** Must match an id in src/lib/store-types.ts (used for /register?type= and /templates/:id). */
  id: string;
  /** Text on the tab button. */
  label: string;
  /** 3D icon on the tab button. */
  icon: ClayIconName;
  /** Image shown when the tab is selected (any size; it is shown in a browser frame). */
  image: string;
  title: string;
  description: string;
  bullets: string[];
}

export const STORE_TYPE_SHOWCASE: StoreTypeShowcase[] = [
  {
    id: 'fashion',
    label: 'أزياء نسائية',
    icon: 'shopping-bag',
    image: '/images/store-types/fashion.webp',
    title: 'متجر أزياء يلفت النظر من أول لمحة',
    description: 'اعرض الفساتين والعبايات بمقاساتها وألوانها، ودع زبونتك تختار وتطلب وتدفع عند الاستلام.',
    bullets: ['خيارات المقاس واللون لكل منتج', 'دليل مقاسات جاهز', 'شارات "وصل حديثاً" و"الأكثر مبيعاً"'],
  },
  {
    id: 'fashion-men',
    label: 'أزياء رجالية',
    icon: 'tag',
    image: '/images/store-types/fashion-men.webp',
    title: 'ملابس رجالية بتصميم أنيق ومرتب',
    description: 'تصنيفات واضحة للقمصان والأحذية والإكسسوارات، مع فلترة سريعة حسب المقاس والسعر.',
    bullets: ['فلاتر حسب المقاس والسعر', 'عروض الكمية: اشترِ 2 واحصل على خصم', 'إدارة المخزون لكل مقاس'],
  },
  {
    id: 'perfume',
    label: 'العطور',
    icon: 'gift',
    image: '/images/store-types/perfume.webp',
    title: 'عطورك بواجهة فاخرة تليق بها',
    description: 'صفحات منتج بصور كبيرة ووصف للمكونات، وأحجام مختلفة لكل عطر بأسعار مختلفة.',
    bullets: ['أحجام متعددة (مل) لكل عطر', 'بطاقات هدايا وتغليف', 'كوبونات للمناسبات'],
  },
  {
    id: 'beauty',
    label: 'التجميل والعناية',
    icon: 'heart',
    image: '/images/store-types/beauty.webp',
    title: 'متجر تجميل يبني ثقة زبائنك',
    description: 'اعرض منتجات العناية والمكياج مع التقييمات، ونظّمها حسب نوع البشرة والاستخدام.',
    bullets: ['تقييمات ومراجعات الزبائن', 'نقاط ولاء تعيد الزبون', 'باقات ومجموعات بسعر خاص'],
  },
  {
    id: 'jewelry',
    label: 'مجوهرات وإكسسوارات',
    icon: 'badge-check',
    image: '/images/store-types/jewelry.webp',
    title: 'مجوهرات بعرض راقٍ وتفاصيل دقيقة',
    description: 'صور مقرّبة ووزن بالغرام لكل قطعة، مع إمكانية الطلب المسبق للقطع حسب الطلب.',
    bullets: ['الوزن بالغرام لكل قطعة', 'طلبات يدوية للقطع الخاصة', 'تغليف هدايا'],
  },
  {
    id: 'electronics',
    label: 'الإلكترونيات والألعاب',
    icon: 'apps',
    image: '/images/store-types/electronics.webp',
    title: 'إلكترونيات ومواصفات واضحة',
    description: 'جداول مواصفات، مقارنة بين المنتجات، وبيع بطاقات الشحن والمفاتيح الرقمية.',
    bullets: ['مقارنة المنتجات', 'منتجات رقمية: بطاقات ومفاتيح', 'تنبيه عند توفر المنتج'],
  },
  {
    id: 'food',
    label: 'المطاعم والأغذية',
    icon: 'basket',
    image: '/images/store-types/food.webp',
    title: 'طلبات الطعام والحلويات بسهولة',
    description: 'قائمة منتجات سريعة، توصيل حسب المنطقة، وطلبات واتساب تُسجّل مباشرة في لوحتك.',
    bullets: ['مناطق ورسوم توصيل لكل محافظة', 'طلبات يدوية من واتساب', 'عروض يومية بعدّاد تنازلي'],
  },
  {
    id: 'books',
    label: 'الكتب والقرطاسية',
    icon: 'documents',
    image: '/images/store-types/books.webp',
    title: 'مكتبتك على الإنترنت',
    description: 'تصنيفات حسب المؤلف والموضوع، وبحث سريع يصل بالقارئ لكتابه خلال ثوانٍ.',
    bullets: ['بحث وفلترة حسب التصنيف', 'شوهد مؤخراً', 'خصومات على المجموعات'],
  },
  {
    id: 'general',
    label: 'متجر عام',
    icon: 'store',
    image: '/images/store-types/general.webp',
    title: 'أي منتج، متجر واحد',
    description: 'قالب مرن يناسب أي نوع منتجات، تخصّصه بألوانك وشعارك وتنشره بنفس اليوم.',
    bullets: ['قوالب قابلة للتخصيص بالكامل', 'دفع عند الاستلام بالدينار', 'تقارير المبيعات بالعربي'],
  },
];
