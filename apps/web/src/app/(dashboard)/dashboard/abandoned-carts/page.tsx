'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Loader2, MessageCircle, Package } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

const BRAND = { primary: '#2F2E4B', accent: '#DB6E93', border: '#FBE1EA', bg: '#F5EFFA' };

interface AbandonedCart {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  updatedAt: string;
  itemCount: number;
  total: number;
  items: { productId: string; name: string; quantity: number; price: number; image: string | null }[];
}

export default function AbandonedCartsPage() {
  useDocumentTitle('السلال المتروكة');
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCarts = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: AbandonedCart[] }>('/api/cart/abandoned');
      setCarts(res.data ?? []);
    } catch { toast.error('فشل تحميل السلال المتروكة'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCarts(); }, [fetchCarts]);

  return (
    <div className="p-6 max-w-4xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: BRAND.bg }}>
          <ShoppingCart className="h-5 w-5" style={{ color: BRAND.accent }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>السلال المتروكة</h1>
          <p className="text-sm text-gray-500 mt-0.5">سلال فيها منتجات ولم تتحرك منذ 3 ساعات على الأقل — إشارة تقريبية وليست مؤكدة</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} /></div>
      ) : carts.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: BRAND.border }}>
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد سلال متروكة حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border p-4" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <span className="font-bold text-sm" style={{ color: BRAND.primary }}>{c.customerName ?? 'زائر'}</span>
                  <p className="text-xs text-gray-400 mt-0.5">منذ {formatDate(c.updatedAt)} · {c.itemCount} قطعة · {formatCurrency(c.total)}</p>
                </div>
                {c.customerPhone && (
                  <a href={`https://wa.me/${c.customerPhone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition hover:bg-green-50"
                    style={{ borderColor: BRAND.border }}>
                    <MessageCircle className="h-3.5 w-3.5 text-green-500" /> تواصل واتساب
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {c.items.map(i => (
                  <span key={i.productId} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-600">
                    <Package className="h-3 w-3" /> {i.name} × {i.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
