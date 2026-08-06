import { Shirt, Sparkles, Gamepad2, Gem, Flower2, BookOpen, UtensilsCrossed, LayoutGrid, type LucideIcon } from 'lucide-react';

export interface StoreTypeConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  unitOptions: { value: string; label: string }[];
  defaultUnit: string;
  themeColor: string;
  accentColor: string;
  templateHint: string;
  sampleCategories: string[];
}

export const STORE_TYPES: StoreTypeConfig[] = [
  {
    id: 'fashion',
    label: 'أزياء نسائية',
    icon: Shirt,
    description: 'متجر ملابس، أحذية، إكسسوارات نسائية',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'set', label: 'طقم' },
      { value: 'pair', label: 'زوج' },
    ],
    defaultUnit: 'piece',
    themeColor: '#7C3F6B',
    accentColor: '#D4547A',
    templateHint: 'bold',
    sampleCategories: ['فساتين', 'عبايات', 'أحذية', 'حقائب', 'إكسسوارات'],
  },
  {
    id: 'fashion-men',
    label: 'أزياء رجالية',
    icon: Shirt,
    description: 'متجر ملابس، أحذية، إكسسوارات رجالية',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'set', label: 'طقم' },
      { value: 'pair', label: 'زوج' },
    ],
    defaultUnit: 'piece',
    themeColor: '#1F2A44',
    accentColor: '#3B5BA5',
    templateHint: 'bold',
    sampleCategories: ['قمصان', 'بناطيل', 'أحذية', 'ساعات', 'إكسسوارات'],
  },
  {
    id: 'jewelry',
    label: 'مجوهرات وإكسسوارات',
    icon: Gem,
    description: 'متجر مجوهرات، ذهب، فضة، إكسسوارات فاخرة',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'set', label: 'طقم' },
      { value: 'g', label: 'غرام' },
    ],
    defaultUnit: 'piece',
    themeColor: '#8A6D1F',
    accentColor: '#C9A227',
    templateHint: 'magazine',
    sampleCategories: ['خواتم', 'قلائد', 'أساور', 'أقراط', 'ساعات'],
  },
  {
    id: 'perfume',
    label: 'العطور',
    icon: Flower2,
    description: 'متجر عطور رجالية ونسائية ومستحضرات معطّرة',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'ml', label: 'مل' },
      { value: 'set', label: 'طقم' },
    ],
    defaultUnit: 'piece',
    themeColor: '#5B3A29',
    accentColor: '#C08552',
    templateHint: 'magazine',
    sampleCategories: ['عطور رجالية', 'عطور نسائية', 'عطور مركزة', 'معطرات منزل', 'عروض'],
  },
  {
    id: 'beauty',
    label: 'البشرة والمكياج',
    icon: Sparkles,
    description: 'مستحضرات تجميل، عناية بالبشرة، إكسسوارات تجميل',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'ml', label: 'مل' },
      { value: 'g', label: 'غرام' },
      { value: 'set', label: 'طقم' },
    ],
    defaultUnit: 'piece',
    themeColor: '#9B3A6B',
    accentColor: '#E8627A',
    templateHint: 'magazine',
    sampleCategories: ['مكياج', 'عناية بالبشرة', 'كريمات', 'أقنعة', 'أظافر'],
  },
  {
    id: 'electronics',
    label: 'الألعاب والإلكترونيات',
    icon: Gamepad2,
    description: 'أجهزة ألعاب، هواتف، حواسيب، ملحقات، بطاقات شحن',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'unit', label: 'وحدة' },
      { value: 'key', label: 'مفتاح' },
      { value: 'card', label: 'بطاقة' },
      { value: 'license', label: 'ترخيص' },
    ],
    defaultUnit: 'piece',
    themeColor: '#1A0A2E',
    accentColor: '#7C3AED',
    templateHint: 'bold',
    sampleCategories: ['PS5', 'Xbox', 'PC Gaming', 'هواتف', 'بطاقات شحن'],
  },
  {
    id: 'books',
    label: 'الكتب والقرطاسية',
    icon: BookOpen,
    description: 'متجر كتب، روايات، قرطاسية، وأدوات مكتبية',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'set', label: 'طقم' },
    ],
    defaultUnit: 'piece',
    themeColor: '#2E4A3D',
    accentColor: '#4E8368',
    templateHint: 'magazine',
    sampleCategories: ['روايات', 'كتب تعليمية', 'قرطاسية', 'دفاتر', 'أدوات مكتبية'],
  },
  {
    id: 'food',
    label: 'الأطعمة والمنتجات الغذائية',
    icon: UtensilsCrossed,
    description: 'متجر أطعمة، حلويات، منتجات غذائية ومخبوزات',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'kg', label: 'كيلوغرام' },
      { value: 'g', label: 'غرام' },
      { value: 'box', label: 'علبة' },
    ],
    defaultUnit: 'piece',
    themeColor: '#8C3A2B',
    accentColor: '#E07A45',
    templateHint: 'bold',
    sampleCategories: ['حلويات', 'مخبوزات', 'منتجات عضوية', 'مشروبات', 'عروض اليوم'],
  },
  {
    id: 'general',
    label: 'متجر عام',
    icon: LayoutGrid,
    description: 'قالب عام قابل للتخصيص لأي نوع منتجات',
    unitOptions: [
      { value: 'piece', label: 'قطعة' },
      { value: 'set', label: 'طقم' },
      { value: 'box', label: 'علبة' },
    ],
    defaultUnit: 'piece',
    themeColor: '#2F2E4B',
    accentColor: '#DB6E93',
    templateHint: 'bold',
    sampleCategories: ['الأكثر مبيعاً', 'وصل حديثاً', 'عروض', 'الكل'],
  },
];

export function getStoreType(id: string): StoreTypeConfig {
  return STORE_TYPES.find(t => t.id === id) ?? STORE_TYPES[0];
}
