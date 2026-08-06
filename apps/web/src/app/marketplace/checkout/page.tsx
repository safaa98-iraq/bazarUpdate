'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Gift, CheckCircle, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useMarketplaceCart } from '@/lib/stores/marketplace-cart.store';

type LoyaltyAccount = {
  totalPoints: number; tier: string; redeemableDiscount: number;
};

type OrderResult = {
  orderId: string; totalAmount: number; discountAmount: number;
  pointsUsed: number; pointsEarned: number;
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function CheckoutPage() {
  useDocumentTitle('إتمام طلب السوق');
  const router = useRouter();
  const { items, total, clear } = useMarketplaceCart();
  const [form, setForm] = useState({
    customerEmail: '', customerName: '', customerPhone: '',
    street: '', city: '', governorate: '', notes: '',
  });
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OrderResult | null>(null);

  const subtotal = total();
  const discount = loyaltyAccount && pointsToRedeem > 0
    ? Math.floor(pointsToRedeem / 100) * 1000
    : 0;
  const grandTotal = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (items.length === 0 && !result) router.push('/marketplace/cart');
  }, [items, result, router]);

  async function checkLoyalty() {
    if (!form.customerEmail) return;
    try {
      const res = await apiFetch<{ success: boolean; data: LoyaltyAccount }>(
        `/api/loyalty/account?email=${encodeURIComponent(form.customerEmail)}`,
        { noAuth: true }
      );
      setLoyaltyAccount(res.data);
    } catch { /* no account yet */ }
  }

  function update(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'customerEmail' && loyaltyAccount) setLoyaltyAccount(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerEmail || !form.customerName) { setError('الاسم والبريد الإلكتروني مطلوبان'); return; }
    if (items.length === 0) { setError('السلة فارغة'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: OrderResult }>('/api/marketplace/orders', {
        method: 'POST',
        noAuth: true,
        body: JSON.stringify({
          customerEmail: form.customerEmail,
          customerName: form.customerName,
          customerPhone: form.customerPhone || undefined,
          shippingAddress: {
            street: form.street, city: form.city,
            governorate: form.governorate, notes: form.notes,
          },
          items: items.map(i => ({ listingId: i.listingId, productId: i.productId, storeId: i.storeId, quantity: i.quantity })),
          pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : undefined,
        }),
      });
      setResult(res.data);
      clear();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    }
    setLoading(false);
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <CheckCircle className="h-14 w-14 mx-auto mb-4" style={{ color: '#22c55e' }} />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">تم تأكيد طلبك!</h1>
          <p className="text-gray-500 mb-6 text-sm">رقم الطلب: <span className="font-mono font-semibold">{result.orderId}</span></p>
          <div className="space-y-2 text-sm mb-6 bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-gray-500">المبلغ المدفوع</span>
              <span className="font-bold" style={{ color: '#DB6E93' }}>{formatCurrency(result.totalAmount)}</span>
            </div>
            {result.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>خصم النقاط</span>
                <span>-{formatCurrency(result.discountAmount)}</span>
              </div>
            )}
            {result.pointsEarned > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>نقاط مكتسبة</span>
                <span>+{result.pointsEarned} نقطة</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link href={`/marketplace/orders/${result.orderId}`}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white text-center transition"
              style={{ background: '#2F2E4B' }}>
              تتبع الطلب
            </Link>
            <Link href="/marketplace"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center border border-gray-200 hover:bg-gray-50 transition">
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/marketplace/cart" className="text-gray-400 hover:text-gray-600">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">إتمام الشراء</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          {/* Left: Form */}
          <div className="space-y-4">
            {/* Customer info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">بيانات العميل</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">الاسم الكامل *</label>
                  <input value={form.customerName} onChange={e => update('customerName', e.target.value)}
                    required placeholder="محمد علي"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">البريد الإلكتروني *</label>
                  <input value={form.customerEmail} onChange={e => update('customerEmail', e.target.value)}
                    onBlur={checkLoyalty}
                    required type="email" placeholder="example@email.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">رقم الهاتف</label>
                  <input value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)}
                    placeholder="07700000000"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400" />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">عنوان التوصيل</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">الشارع والمنطقة</label>
                  <input value={form.street} onChange={e => update('street', e.target.value)}
                    placeholder="شارع المتنبي"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">المدينة</label>
                  <input value={form.city} onChange={e => update('city', e.target.value)}
                    placeholder="بغداد"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">المحافظة</label>
                  <input value={form.governorate} onChange={e => update('governorate', e.target.value)}
                    placeholder="بغداد"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
                  <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
                    rows={2} placeholder="أي تعليمات للتوصيل..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-purple-400 resize-none" />
                </div>
              </div>
            </div>

            {/* Loyalty */}
            {loyaltyAccount && loyaltyAccount.totalPoints > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="h-4 w-4" style={{ color: '#DB6E93' }} />
                  <h2 className="text-sm font-bold text-gray-700">نقاط الولاء</h2>
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-500">نقاطك المتاحة</span>
                  <span className="font-bold" style={{ color: '#2F2E4B' }}>{loyaltyAccount.totalPoints} نقطة</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-500">قيمة الخصم</span>
                  <span className="font-bold text-green-600">{formatCurrency(loyaltyAccount.redeemableDiscount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={loyaltyAccount.totalPoints}
                    step={100}
                    value={pointsToRedeem}
                    onChange={e => setPointsToRedeem(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-20 text-left" style={{ color: '#DB6E93' }}>
                    {pointsToRedeem} نقطة
                  </span>
                </div>
                {pointsToRedeem > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    خصم: {formatCurrency(Math.floor(pointsToRedeem / 100) * 1000)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Order summary */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-20">
              <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" style={{ color: '#DB6E93' }} />
                ملخص الطلب
              </h2>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {items.map(item => (
                  <div key={item.listingId} className="flex items-center gap-2 text-xs">
                    {item.image
                      ? <img src={item.image} className="h-8 w-8 rounded object-cover" alt="" />
                      : <div className="h-8 w-8 rounded bg-gray-100" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-gray-700">{item.name}</p>
                      <p className="text-gray-400">{item.quantity} × {formatCurrency(item.price)}</p>
                    </div>
                    <span className="font-semibold text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم النقاط</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>المبلغ النهائي</span>
                  <span style={{ color: '#DB6E93' }}>{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

              <button type="submit" disabled={loading}
                className="mt-4 w-full py-3 rounded-xl font-semibold text-white text-sm transition disabled:opacity-60"
                style={{ background: '#DB6E93' }}>
                {loading ? 'جاري المعالجة...' : 'تأكيد الطلب'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
