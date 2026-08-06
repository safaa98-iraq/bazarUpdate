import { Shirt, Sparkles, Gamepad2, Gem, Flower2, BookOpen, UtensilsCrossed, LayoutGrid, type LucideIcon } from 'lucide-react';

export type SectionType =
  | 'hero' | 'products' | 'categories' | 'announcement' | 'about'
  | 'newsletter' | 'divider' | 'discount' | 'testimonials' | 'features' | 'gallery' | 'brands' | 'video';

export interface BuilderSection {
  id: string; type: SectionType; visible: boolean;
  settings: Record<string, string | number | boolean>;
}

export const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

export const DEFAULT_SETTINGS: Record<SectionType, Record<string, string | number | boolean>> = {
  hero: {
    title: 'مرحباً بك في متجرنا', subtitle: 'اكتشف أفضل المنتجات بأسعار لا تُقاوم',
    buttonText: 'تسوق الآن', buttonUrl: '#products',
    height: 'large', textAlign: 'center', backgroundColor: BRAND.primary,
    backgroundImage: '', overlayOpacity: 40,
  },
  products: {
    title: 'منتجاتنا المميزة', subtitle: 'اختر من بين تشكيلة واسعة من المنتجات',
    columns: 4, limit: 8, showComparePrice: true, showAddToCart: true,
  },
  categories: { title: 'تصفح حسب التصنيف', style: 'grid' },
  brands: { title: 'تسوّق حسب الماركة', limit: 6 },
  announcement: {
    text: 'عرض خاص! خصم 20% على جميع المنتجات — استخدم الكود WELCOME20',
    link: '', backgroundColor: BRAND.accent, textColor: '#ffffff', dismissible: true,
  },
  discount: {
    title: 'عرض خاص لفترة محدودة!',
    subtitle: 'استخدم الكود أدناه واحصل على خصم فوري',
    couponCode: 'SAVE20',
    discountLabel: 'خصم 20%',
    backgroundColor: BRAND.primary,
    badgeColor: BRAND.accent,
    showTimer: false,
    expiryHours: 24,
  },
  features: {
    title: 'لماذا تختارنا؟',
    feature1Icon: '', feature1Title: 'شحن سريع', feature1Desc: 'توصيل خلال 24 ساعة',
    feature2Icon: '', feature2Title: 'دفع آمن', feature2Desc: 'حماية كاملة لبياناتك',
    feature3Icon: '', feature3Title: 'جودة عالية', feature3Desc: 'منتجات مضمونة ومعتمدة',
    feature4Icon: '', feature4Title: 'إرجاع مجاني', feature4Desc: 'إرجاع مجاني خلال 30 يوم',
    columns: 4,
  },
  testimonials: {
    title: 'ماذا يقول عملاؤنا',
    review1Name: 'أحمد محمد', review1Text: 'منتجات رائعة وخدمة ممتازة، أنصح بالتجربة!', review1Stars: 5,
    review2Name: 'سارة علي', review2Text: 'تجربة تسوق سهلة والشحن كان سريعاً جداً.', review2Stars: 5,
    review3Name: 'خالد العمر', review3Text: 'جودة المنتج فاقت توقعاتي، شكراً جزيلاً.', review3Stars: 4,
  },
  gallery: {
    title: 'معرض صورنا',
    image1: '', image2: '', image3: '', image4: '', image5: '', image6: '',
    columns: 3,
  },
  about: {
    title: 'قصتنا',
    content: 'نحن متجر رائد في تقديم أفضل المنتجات بجودة عالية وأسعار منافسة.',
    imageUrl: '', imagePosition: 'right',
  },
  newsletter: {
    title: 'اشترك في نشرتنا البريدية',
    subtitle: 'احصل على أحدث العروض والمنتجات مباشرة إلى بريدك',
    buttonText: 'اشترك الآن', placeholder: 'أدخل بريدك الإلكتروني',
    backgroundColor: BRAND.secondary,
  },
  divider: { height: 40, showLine: true, lineColor: '#ECE6F0' },
  video: {
    title: 'شاهد متجرنا عن قرب',
    videoUrl: '',
    aspectRatio: '16:9',
  },
};

export interface StoreTemplate {
  id: string; label: string; icon: LucideIcon; desc: string;
  storeTypes: string[];
  themeColor: string;
  sections: Omit<BuilderSection, 'id'>[];
}

export const STORE_TEMPLATES: StoreTemplate[] = [
  {
    id: 'fashion-bold',
    label: 'الملابس والأزياء',
    icon: Shirt,
    desc: 'تصميم جذاب للملابس والإكسسوارات',
    storeTypes: ['fashion'],
    themeColor: '#7C3F6B',
    sections: [
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#7C3F6B', title: 'أحدث صيحات الموضة', subtitle: 'كولكشن جديد كل أسبوع', buttonText: 'اكتشفي الآن', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تسوقي حسب القسم', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'الجديد والمميز', columns: 4, limit: 8 } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials, title: 'آراء عملاؤنا' } },
      { type: 'newsletter', visible: true, settings: { ...DEFAULT_SETTINGS.newsletter, backgroundColor: '#DB6E93', title: 'كوني أول من يعرف!' } },
    ],
  },
  {
    id: 'beauty-glow',
    label: 'البشرة والمكياج',
    icon: Sparkles,
    desc: 'تصميم أنيق لمنتجات التجميل والعناية',
    storeTypes: ['beauty'],
    themeColor: '#9B3A6B',
    sections: [
      { type: 'announcement', visible: true, settings: { text: 'مجموعة جديدة وصلت — عناية فائقة لبشرتك', backgroundColor: '#9B3A6B', textColor: '#ffffff', dismissible: true, link: '' } },
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#9B3A6B', title: 'اكتشفي سر جمالك', subtitle: 'منتجات طبيعية فاخرة لعناية كاملة', buttonText: 'تسوقي الآن', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تصفحي حسب الفئة', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'الأكثر مبيعاً', columns: 4, limit: 8 } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'مكونات طبيعية', feature1Desc: 'خالية من المواد الضارة', feature2Title: 'مختبرة طبياً', feature2Desc: 'آمنة لجميع أنواع البشرة', feature3Title: 'توصيل سريع', feature3Desc: 'شحن مجاني للطلبات الكبيرة', feature4Title: 'إرجاع مجاني', feature4Desc: '30 يوم ضمان الرضا' } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials, title: 'تجارب عملاؤنا الجميلة' } },
    ],
  },
  {
    id: 'electronics-gaming',
    label: 'الألعاب والإلكترونيات',
    icon: Gamepad2,
    desc: 'تصميم احترافي للألعاب والأجهزة التقنية',
    storeTypes: ['electronics'],
    themeColor: '#1A0A2E',
    sections: [
      { type: 'announcement', visible: true, settings: { text: 'عروض حصرية على أجهزة الألعاب — شحن مجاني للطلبات فوق 50,000 د.ع', backgroundColor: '#1A0A2E', textColor: '#ffffff', dismissible: false, link: '' } },
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#1A0A2E', title: 'عالم الألعاب والتقنية', subtitle: 'أحدث الأجهزة وبطاقات الشحن بأفضل الأسعار', buttonText: 'تسوق الآن', height: 'large', textAlign: 'right' } },
      { type: 'categories', visible: true, settings: { title: 'تصفح حسب الفئة', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'عروض اليوم', columns: 4, limit: 8, showComparePrice: true } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'ضمان سنة', feature1Desc: 'ضمان شامل على جميع المنتجات', feature2Title: 'شحن سريع', feature2Desc: 'توصيل خلال 48 ساعة', feature3Title: 'منتجات أصلية', feature3Desc: '100% أصلية ومعتمدة', feature4Title: 'إرجاع مجاني', feature4Desc: 'إرجاع سهل خلال 14 يوم' } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials } },
    ],
  },
  {
    id: 'fashion-men-classic',
    label: 'الأزياء الرجالية',
    icon: Shirt,
    desc: 'تصميم أنيق وعملي للملابس والإكسسوارات الرجالية',
    storeTypes: ['fashion-men'],
    themeColor: '#1F2A44',
    sections: [
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#1F2A44', title: 'أناقة رجالية بلا حدود', subtitle: 'تشكيلة كاملة من الملابس والإكسسوارات', buttonText: 'تسوق الآن', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تسوق حسب القسم', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'الأكثر مبيعاً', columns: 4, limit: 8 } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'جودة عالية', feature1Desc: 'أقمشة وخامات مختارة بعناية', feature2Title: 'شحن سريع', feature2Desc: 'توصيل خلال 48 ساعة', feature3Title: 'مقاسات دقيقة', feature3Desc: 'جدول مقاسات واضح لكل قطعة', feature4Title: 'إرجاع سهل', feature4Desc: 'استبدال أو إرجاع خلال 14 يوم' } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials, title: 'آراء عملاؤنا' } },
    ],
  },
  {
    id: 'jewelry-luxe',
    label: 'المجوهرات والإكسسوارات',
    icon: Gem,
    desc: 'تصميم فاخر يليق بالمجوهرات والقطع الثمينة',
    storeTypes: ['jewelry'],
    themeColor: '#8A6D1F',
    sections: [
      { type: 'announcement', visible: true, settings: { text: 'قطع مختارة بعناية — ضمان الأصالة على كل منتج', backgroundColor: '#8A6D1F', textColor: '#ffffff', dismissible: true, link: '' } },
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#8A6D1F', title: 'بريق يليق بك', subtitle: 'مجوهرات فاخرة لكل مناسبة', buttonText: 'اكتشفي المجموعة', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تصفحي حسب النوع', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'القطع المميزة', columns: 4, limit: 8, showComparePrice: true } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'ضمان الأصالة', feature1Desc: 'شهادة أصالة مع كل قطعة', feature2Title: 'تغليف فاخر', feature2Desc: 'مناسب للهدايا', feature3Title: 'شحن آمن', feature3Desc: 'تأمين كامل أثناء التوصيل', feature4Title: 'إرجاع مجاني', feature4Desc: 'خلال 14 يوم' } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials, title: 'قالوا عن قطعنا' } },
    ],
  },
  {
    id: 'perfume-elegant',
    label: 'العطور',
    icon: Flower2,
    desc: 'تصميم راقي يبرز فخامة العطور',
    storeTypes: ['perfume'],
    themeColor: '#5B3A29',
    sections: [
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#5B3A29', title: 'عطرك الذي يعبّر عنك', subtitle: 'تشكيلة فاخرة من العطور الرجالية والنسائية', buttonText: 'تسوق الآن', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تصفح حسب الفئة', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'الأكثر رواجاً', columns: 4, limit: 8 } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'تركيز عالي', feature1Desc: 'ثبات يدوم طويلاً', feature2Title: 'منتجات أصلية', feature2Desc: '100% أصلية ومضمونة', feature3Title: 'تغليف أنيق', feature3Desc: 'مناسب للإهداء', feature4Title: 'شحن سريع', feature4Desc: 'توصيل خلال 48 ساعة' } },
      { type: 'newsletter', visible: true, settings: { ...DEFAULT_SETTINGS.newsletter, backgroundColor: '#5B3A29', title: 'اشترك واحصل على عروض حصرية' } },
    ],
  },
  {
    id: 'books-cozy',
    label: 'الكتب والقرطاسية',
    icon: BookOpen,
    desc: 'تصميم هادئ ومرتب للكتب والقرطاسية',
    storeTypes: ['books'],
    themeColor: '#2E4A3D',
    sections: [
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#2E4A3D', title: 'اكتشف عالماً من القراءة', subtitle: 'روايات، كتب تعليمية، وقرطاسية بأفضل الأسعار', buttonText: 'تصفح الكتب', height: 'large', textAlign: 'right' } },
      { type: 'categories', visible: true, settings: { title: 'تصفح حسب القسم', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'إصدارات جديدة', columns: 4, limit: 8 } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'نسخ أصلية', feature1Desc: 'إصدارات موثوقة ومضمونة', feature2Title: 'شحن آمن', feature2Desc: 'تغليف يحافظ على الكتب', feature3Title: 'أسعار مناسبة', feature3Desc: 'عروض على المجموعات', feature4Title: 'إرجاع سهل', feature4Desc: 'خلال 7 أيام' } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials, title: 'آراء القرّاء' } },
    ],
  },
  {
    id: 'food-fresh',
    label: 'الأطعمة والمنتجات الغذائية',
    icon: UtensilsCrossed,
    desc: 'تصميم شهي وجذاب للأطعمة والمخبوزات',
    storeTypes: ['food'],
    themeColor: '#8C3A2B',
    sections: [
      { type: 'announcement', visible: true, settings: { text: 'طلبات اليوم تُحضّر طازجة — اطلب الآن', backgroundColor: '#8C3A2B', textColor: '#ffffff', dismissible: true, link: '' } },
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#8C3A2B', title: 'نكهة تستحق التجربة', subtitle: 'أطعمة ومخبوزات طازجة تُحضّر بعناية', buttonText: 'اطلب الآن', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تصفح حسب القسم', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'الأكثر طلباً', columns: 4, limit: 8 } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features, feature1Title: 'طازج يومياً', feature1Desc: 'تحضير طازج قبل التوصيل', feature2Title: 'توصيل سريع', feature2Desc: 'يصلك خلال ساعات', feature3Title: 'مكونات مختارة', feature3Desc: 'جودة عالية ونظافة تامة', feature4Title: 'طلبات كبيرة', feature4Desc: 'مناسب للمناسبات' } },
      { type: 'testimonials', visible: true, settings: { ...DEFAULT_SETTINGS.testimonials, title: 'آراء زبائننا' } },
    ],
  },
  {
    id: 'general-versatile',
    label: 'متجر عام',
    icon: LayoutGrid,
    desc: 'قالب مرن قابل للتخصيص لأي نوع منتجات',
    storeTypes: ['general'],
    themeColor: '#2F2E4B',
    sections: [
      { type: 'hero', visible: true, settings: { ...DEFAULT_SETTINGS.hero, backgroundColor: '#2F2E4B', title: 'مرحباً بك في متجرنا', subtitle: 'كل ما تحتاجه في مكان واحد', buttonText: 'تسوق الآن', height: 'large', textAlign: 'center' } },
      { type: 'categories', visible: true, settings: { title: 'تصفح حسب التصنيف', style: 'grid' } },
      { type: 'products', visible: true, settings: { ...DEFAULT_SETTINGS.products, title: 'منتجاتنا المميزة', columns: 4, limit: 8 } },
      { type: 'features', visible: true, settings: { ...DEFAULT_SETTINGS.features } },
      { type: 'newsletter', visible: true, settings: { ...DEFAULT_SETTINGS.newsletter } },
    ],
  },
];
