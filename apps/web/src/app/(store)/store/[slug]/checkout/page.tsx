'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/lib/stores/cart.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { toast } from 'sonner';
import { ShoppingBag, ArrowRight, Truck, CheckCircle2, Loader2, Package, ShieldCheck, Tag, Gift, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { IRAQI_GOVERNORATES, type StoreDeliveryZone } from '@storebuilder/types';

interface StoreInfo { name: string; theme: string; logo?: string; deliveryZones?: StoreDeliveryZone[]; }

interface CheckoutPreview {
  subtotal: number; promoDiscount: number;
  couponDiscount: number; couponError: string | null;
  giftCardDeducted: number; giftCardError: string | null;
  shippingFee: number; total: number;
}

export default function CheckoutPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { items, storeId, total, clearCart } = useCartStore();
  const customerUser = useAuthStore(s => s.user);
  const isLoggedInCustomer = customerUser?.role === 'CUSTOMER';
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customerName: customerUser?.role === 'CUSTOMER' ? customerUser.name : '', customerPhone: '',
    governorate: '', city: '', address: '', notes: '',
    couponCode: '', giftCardCode: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    api.get<{ success: boolean; data: StoreInfo }>(`/api/storefront/${slug}`, { noAuth: true })
      .then(r => setStore(r.data)).catch(() => null);
  }, [slug]);

  useEffect(() => {
    if (store?.name) document.title = `إتمام الطلب — ${store.name}`;
  }, [store?.name]);

  const theme = store?.theme ?? '#2F2E4B';
  const zones = store?.deliveryZones ?? [];
  const deliverableGovernorates = zones.length > 0 ? zones.map(z => z.governorate) : IRAQI_GOVERNORATES;
  const shippingFee = zones.find(z => z.governorate === form.governorate)?.price ?? 0;
  const grandTotal = total() + shippingFee;

  // Live subtotal/discount/total preview — recomputed on the server whenever the cart,
  // coupon code, gift card code, or shipping fee changes, so the customer always sees the real total before submitting.
  useEffect(() => {
    if (items.length === 0) return;
    setPreviewLoading(true);
    const t = setTimeout(() => {
      api.post<{ success: boolean; data: CheckoutPreview }>(`/api/storefront/${slug}/checkout/preview`, {
        items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, variantId: i.variantId ?? undefined })),
        shippingFee,
        couponCode: form.couponCode || undefined,
        giftCardCode: form.giftCardCode || undefined,
      }, { noAuth: true })
        .then(r => setPreview(r.data))
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, items, shippingFee, form.couponCode, form.giftCardCode]);

  const displayTotal = preview?.total ?? grandTotal;

  if (items.length === 0) return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl" style={{ background: '#F5EFFA' }}>
      <div className="text-center">
        <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">سلتك فارغة</p>
      </div>
    </div>
  );

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.customerName.trim()) e.customerName = 'الاسم مطلوب';
    if (!form.customerPhone.trim()) e.customerPhone = 'رقم الهاتف مطلوب';
    if (!form.governorate) e.governorate = 'المحافظة مطلوبة';
    if (!form.city.trim()) e.city = 'المدينة / الحي مطلوب';
    if (!form.address.trim()) e.address = 'العنوان مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!storeId) { toast.error('خطأ في معرف المتجر'); return; }

    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; data: { id: string; total: number } }>(
        `/api/storefront/${slug}/checkout`,
        {
          ...form,
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, variantId: i.variantId ?? undefined })),
        },
        { noAuth: !isLoggedInCustomer }
      );
      clearCart();
      router.push(`/store/${slug}/order-confirmation?orderId=${res.data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof typeof form) =>
    `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition ${errors[field] ? 'border-red-400 bg-red-50' : 'border-[#ECE6F0] focus:border-[#DB6E93]'}`;

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: '#F7F5FC' }}>
      {/* Navbar */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href={`/store/${slug}/cart`} className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition" style={{ color: theme }}>
            <ArrowRight className="h-4 w-4" />
            العودة إلى السلة
          </Link>
          <div className="flex items-center gap-2">
            {store?.logo
              ? <Image src={store.logo} alt={store?.name ?? ''} width={28} height={28} className="rounded-lg object-contain" />
              : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: theme }}>{store?.name?.charAt(0)}</div>}
            <span className="font-bold text-sm text-gray-900">{store?.name}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">إتمام الطلب</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Contact info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: theme }}>١</span>
                  بيانات التواصل
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم الكامل *</label>
                    <input value={form.customerName} onChange={set('customerName')} placeholder="أحمد محمد علي"
                      className={inputClass('customerName')} />
                    {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الهاتف *</label>
                    <input value={form.customerPhone} onChange={set('customerPhone')} placeholder="07XX XXX XXXX" type="tel"
                      className={inputClass('customerPhone')} />
                    {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: theme }}>٢</span>
                  عنوان التوصيل
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">المحافظة *</label>
                    <select value={form.governorate} onChange={set('governorate')}
                      className={inputClass('governorate') + ' cursor-pointer'}>
                      <option value="">اختر المحافظة</option>
                      {deliverableGovernorates.map(g => {
                        const zone = zones.find(z => z.governorate === g);
                        return <option key={g} value={g}>{g}{zone ? ` — ${formatCurrency(zone.price)}` : ''}</option>;
                      })}
                    </select>
                    {errors.governorate && <p className="text-red-500 text-xs mt-1">{errors.governorate}</p>}
                    {zones.length === 0 && <p className="text-xs text-gray-400 mt-1">التوصيل متاح لجميع المحافظات بدون رسوم إضافية حالياً</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">المدينة / الحي *</label>
                    <input value={form.city} onChange={set('city')} placeholder="الكرخ، المنصور…"
                      className={inputClass('city')} />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">العنوان التفصيلي *</label>
                  <input value={form.address} onChange={set('address')} placeholder="الشارع، رقم البيت، علامة مميزة…"
                    className={inputClass('address')} />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات (اختياري)</label>
                  <textarea value={form.notes} onChange={set('notes')} rows={2}
                    placeholder="أي تعليمات خاصة للتوصيل…"
                    className="w-full px-4 py-3 rounded-xl border border-[#ECE6F0] text-sm focus:outline-none focus:border-[#DB6E93] transition resize-none" />
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: theme }}>٣</span>
                  طريقة الدفع
                </h2>
                <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2" style={{ borderColor: theme, background: `${theme}08` }}>
                  <Truck className="h-5 w-5 flex-shrink-0" style={{ color: theme }} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: theme }}>الدفع عند الاستلام</p>
                    <p className="text-xs text-gray-500 mt-0.5">ادفع نقداً عند وصول طلبك</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 mr-auto flex-shrink-0" style={{ color: theme }} />
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-2xl p-6 h-fit shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">ملخص الطلب</h2>

              <div className="space-y-3 mb-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#F5EFFA' }}>
                      {item.product.images?.[0]
                        ? <Image src={item.product.images[0]} alt={item.product.name} width={40} height={40} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={16} /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.variantLabel ? `${item.variantLabel} · ` : ''}× {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mb-4 space-y-2.5" style={{ borderColor: '#ECE6F0' }}>
                <div>
                  <div className="relative">
                    <Tag className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={form.couponCode} onChange={set('couponCode')} placeholder="كود الخصم (اختياري)"
                      className="w-full pr-8 pl-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#DB6E93] transition"
                      style={{ borderColor: '#ECE6F0' }} />
                  </div>
                  {form.couponCode && preview && (
                    preview.couponError
                      ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> {preview.couponError}</p>
                      : preview.couponDiscount > 0
                        ? <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> تم تطبيق خصم {formatCurrency(preview.couponDiscount)}</p>
                        : null
                  )}
                </div>
                <div>
                  <div className="relative">
                    <Gift className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={form.giftCardCode} onChange={set('giftCardCode')} placeholder="كود بطاقة الهدايا (اختياري)"
                      className="w-full pr-8 pl-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#DB6E93] transition"
                      style={{ borderColor: '#ECE6F0' }} dir="ltr" />
                  </div>
                  {form.giftCardCode && preview && (
                    preview.giftCardError
                      ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> {preview.giftCardError}</p>
                      : preview.giftCardDeducted > 0
                        ? <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> تم خصم {formatCurrency(preview.giftCardDeducted)} من رصيد البطاقة</p>
                        : null
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mb-5 space-y-2" style={{ borderColor: '#ECE6F0' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">المجموع الفرعي</span>
                  <span className="text-gray-700">{formatCurrency(preview?.subtotal ?? total())}</span>
                </div>
                {!!preview?.promoDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">خصم تلقائي (عرض)</span>
                    <span className="text-emerald-600">− {formatCurrency(preview.promoDiscount)}</span>
                  </div>
                )}
                {!!preview?.couponDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">كود الخصم</span>
                    <span className="text-emerald-600">− {formatCurrency(preview.couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">رسوم التوصيل</span>
                  <span className="text-gray-700">
                    {form.governorate ? formatCurrency(shippingFee) : 'اختر المحافظة'}
                  </span>
                </div>
                {!!preview?.giftCardDeducted && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">بطاقة الهدايا</span>
                    <span className="text-emerald-600">− {formatCurrency(preview.giftCardDeducted)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t items-center" style={{ borderColor: '#ECE6F0' }}>
                  <span className="text-gray-700">المجموع الكلي</span>
                  <span style={{ color: theme }} className="flex items-center gap-1.5">
                    {previewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {formatCurrency(displayTotal)}
                  </span>
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3.5 font-bold text-white rounded-2xl transition hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${theme}, #DB6E93)` }}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ تأكيد الطلب…</>
                  : '✓ تأكيد الطلب'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1"><ShieldCheck size={12} /> بياناتك محمية ومشفرة</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
