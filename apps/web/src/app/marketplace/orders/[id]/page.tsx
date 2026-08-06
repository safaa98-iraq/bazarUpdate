'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Package, Store, CheckCircle, Clock, Truck, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

type SubOrderItem = { id: string; productName: string; productImage: string | null; quantity: number; price: number; total: number };
type SubOrder = { id: string; storeId: string; storeName: string; storeLogo: string | null; storeTotal: number; status: string; trackingNumber: string | null; items: SubOrderItem[] };
type MarketplaceOrder = {
  id: string; customerName: string; customerEmail: string;
  totalAmount: number; discountAmount: number; pointsEarned: number;
  status: string; paymentStatus: string; createdAt: string;
  shippingAddress: Record<string, string>;
  subOrders: SubOrder[];
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock, processing: Package, shipped: Truck, delivered: CheckCircle, cancelled: XCircle,
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي',
};
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', processing: '#3b82f6', shipped: '#8b5cf6', delivered: '#22c55e', cancelled: '#ef4444',
};

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function OrderTrackingPage() {
  useDocumentTitle('تتبع الطلب');
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<MarketplaceOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ success: boolean; data: MarketplaceOrder }>(`/api/marketplace/orders/${id}`, { noAuth: true })
      .then(r => setOrder(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );

  if (!order) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">
      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>الطلب غير موجود</p>
      <Link href="/marketplace" className="mt-4 inline-block text-sm underline" style={{ color: '#DB6E93' }}>
        العودة للسوق
      </Link>
    </div>
  );

  const StatusIcon = STATUS_ICONS[order.status] ?? Clock;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">تتبع الطلب</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{order.id}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ color: STATUS_COLORS[order.status], background: STATUS_COLORS[order.status] + '15' }}>
            <StatusIcon className="h-4 w-4" />
            {STATUS_LABELS[order.status] ?? order.status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">الاسم</p>
            <p className="font-medium text-gray-700">{order.customerName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">البريد الإلكتروني</p>
            <p className="font-medium text-gray-700">{order.customerEmail}</p>
          </div>
          {order.shippingAddress?.city && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">العنوان</p>
              <p className="font-medium text-gray-700">
                {[order.shippingAddress.street, order.shippingAddress.city, order.shippingAddress.governorate].filter(Boolean).join('، ')}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
          <span className="text-gray-500">المبلغ الإجمالي</span>
          <span className="font-bold" style={{ color: '#DB6E93' }}>{formatCurrency(order.totalAmount)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>خصم النقاط</span>
            <span>-{formatCurrency(order.discountAmount)}</span>
          </div>
        )}
        {order.pointsEarned > 0 && (
          <div className="flex justify-between text-sm text-blue-500">
            <span>نقاط مكتسبة</span>
            <span>+{order.pointsEarned} نقطة</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {order.subOrders?.map(sub => (
          <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: '#F8F5FF' }}>
              <div className="flex items-center gap-2">
                {sub.storeLogo
                  ? <img src={sub.storeLogo} className="h-6 w-6 rounded object-cover" alt="" />
                  : <Store className="h-4 w-4" style={{ color: '#2F2E4B' }} />
                }
                <span className="text-sm font-semibold" style={{ color: '#2F2E4B' }}>{sub.storeName}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium`}
                style={{ color: STATUS_COLORS[sub.status] ?? '#9ca3af', background: (STATUS_COLORS[sub.status] ?? '#9ca3af') + '15' }}>
                {STATUS_LABELS[sub.status] ?? sub.status}
              </span>
            </div>

            {sub.trackingNumber && (
              <div className="px-4 py-2 bg-blue-50 text-xs text-blue-700 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                رقم التتبع: <span className="font-mono font-semibold">{sub.trackingNumber}</span>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {sub.items?.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    {item.productImage
                      ? <img src={item.productImage} className="w-full h-full object-cover" alt="" />
                      : <Package className="h-6 w-6 m-3 text-gray-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(item.price)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 text-sm flex justify-between">
              <span className="text-gray-500">مجموع المتجر</span>
              <span className="font-bold">{formatCurrency(sub.storeTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <Link href="/marketplace" className="text-sm text-gray-400 hover:underline">
          متابعة التسوق
        </Link>
      </div>
    </div>
  );
}
