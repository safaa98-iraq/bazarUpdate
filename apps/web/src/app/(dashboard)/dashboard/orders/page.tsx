'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { OrderPublic, OrderStatusType, StorePublic, ProductSpecPublic } from '@storebuilder/types';
import { ChevronDown, ChevronLeft, ShoppingBag, Loader2, MapPin, Package, Printer, Truck, User, Mail, Phone, CreditCard } from 'lucide-react';
import { trackPage, track } from '@/lib/track';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

const STATUS_AR: Record<string, string> = {
  DRAFT: 'مسودة', PENDING: 'معلّق', PAID: 'مدفوع', SHIPPED: 'شُحن', DELIVERED: 'مُستلم', CANCELLED: 'ملغي',
};
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#F5EFFA', color: '#6B21A8' },
  PENDING:   { bg: '#FEF3C7', color: '#92400E' },
  PAID:      { bg: '#D1FAE5', color: '#065F46' },
  SHIPPED:   { bg: '#DBEAFE', color: '#1E40AF' },
  DELIVERED: { bg: '#D1FAE5', color: '#065F46' },
  CANCELLED: { bg: '#FEE2E2', color: '#991B1B' },
};
const STATUS_TRANSITIONS: Record<string, OrderStatusType[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [], CANCELLED: [],
};
const NEXT_STATUS_LABEL: Record<string, string> = {
  PAID: 'تم الدفع', SHIPPED: 'تم الشحن', DELIVERED: 'تم الاستلام', CANCELLED: 'إلغاء',
};
const FILTERS = [
  { value: 'ALL', label: 'الكل' },
  { value: 'PENDING', label: 'معلّق' },
  { value: 'PAID', label: 'مدفوع' },
  { value: 'SHIPPED', label: 'شُحن' },
  { value: 'DELIVERED', label: 'مُستلم' },
  { value: 'CANCELLED', label: 'ملغي' },
];

// shippingAddress is free-form JSON — storefront checkout uses
// {governorate, city, address, notes}, the embed widget uses
// {line1, line2, city, state, postalCode, country}
function formatAddress(shippingAddress: Record<string, unknown>) {
  const addr = shippingAddress as Record<string, string | undefined>;
  const line = addr.line1 ?? addr.address ?? '';
  const region = [addr.city ?? addr.governorate, addr.state].filter(Boolean).join('، ');
  return { line, line2: addr.line2, region, postalCode: addr.postalCode, country: addr.country, notes: addr.notes };
}

function SpecsSummary({ specs }: { specs?: ProductSpecPublic[] }) {
  if (!specs || specs.length === 0) return null;
  return (
    <p className="text-xs text-gray-400 print:text-gray-600 mt-0.5">
      {specs.map(s => `${s.name}: ${s.values.map(v => v.value).join('، ')}`).join(' · ')}
    </p>
  );
}

function AddressBlock({ shippingAddress }: { shippingAddress: Record<string, unknown> }) {
  const addr = formatAddress(shippingAddress);
  return (
    <>
      {addr.line}
      {addr.line2 ? `, ${addr.line2}` : ''}<br />
      {addr.region} {addr.postalCode ?? ''}<br />
      {addr.country ?? ''}
      {addr.notes ? <><br /><span className="text-xs text-gray-400 print:text-gray-600">{addr.notes}</span></> : null}
    </>
  );
}

function PrintableInvoice({ order, storeName }: { order: OrderPublic; storeName: string }) {
  return (
    <div className="hidden print:block p-10" dir="rtl">
      <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{storeName}</h1>
          <p className="text-sm text-gray-500 mt-1">فاتورة / إيصال طلب</p>
        </div>
        <div className="text-left">
          <p className="text-sm text-gray-700">طلب #{order.id.slice(-8).toUpperCase()}</p>
          <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
          <p className="text-sm font-bold mt-1">{STATUS_AR[order.status] ?? order.status}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">بيانات الزبون</p>
          <p className="text-sm text-gray-900 font-medium">{order.customerName}</p>
          {order.customerPhone && <p className="text-sm text-gray-700">{order.customerPhone}</p>}
          <p className="text-sm text-gray-700">{order.customerEmail}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">عنوان الشحن</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            <AddressBlock shippingAddress={order.shippingAddress} />
          </p>
        </div>
      </div>

      <table className="w-full text-sm mb-6 border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="text-right py-2">المنتج</th>
            <th className="text-center py-2">الكمية</th>
            <th className="text-center py-2">السعر</th>
            <th className="text-left py-2">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-2">
                {item.product?.name ?? item.productId}
                <SpecsSummary specs={item.product?.specs} />
              </td>
              <td className="text-center py-2">{item.quantity}</td>
              <td className="text-center py-2">{formatCurrency(item.price)}</td>
              <td className="text-left py-2">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-56">
          <div className="flex justify-between py-2 border-t-2 border-gray-800 text-base font-bold">
            <span>الإجمالي</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {order.stripePaymentId ? 'مدفوع إلكترونياً' : 'الدفع عند الاستلام'}
          </p>
        </div>
      </div>
    </div>
  );
}

function PrintableShippingLabel({ order, storeName }: { order: OrderPublic; storeName: string }) {
  const addr = formatAddress(order.shippingAddress);
  return (
    <div className="hidden print:flex print:flex-col p-10 justify-between" style={{ minHeight: '100vh' }} dir="rtl">
      <div>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-3 mb-6">
          <span className="text-lg font-bold text-gray-900">{storeName}</span>
          <span className="text-sm text-gray-500">بوليصة شحن</span>
        </div>
        <p className="text-xs font-bold text-gray-500 mb-1">إلى</p>
        <p className="text-2xl font-bold text-gray-900 mb-2">{order.customerName}</p>
        {order.customerPhone && <p className="text-xl text-gray-800 mb-3" dir="ltr">{order.customerPhone}</p>}
        <p className="text-lg text-gray-800 leading-relaxed"><AddressBlock shippingAddress={order.shippingAddress} /></p>
        {addr.notes && <p className="text-sm text-gray-500 mt-2">ملاحظة: {addr.notes}</p>}
      </div>
      <div className="border-t-2 border-gray-800 pt-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">رقم الطلب</span>
        <span className="text-xl font-mono font-bold text-gray-900">#{order.id.slice(-8).toUpperCase()}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-gray-500">الدفع</span>
        <span className="text-base font-bold text-gray-900">{order.stripePaymentId ? 'مدفوع إلكترونياً' : `الدفع عند الاستلام — ${formatCurrency(order.total)}`}</span>
      </div>
    </div>
  );
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function OrdersPage() {
  useDocumentTitle('الطلبات');
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [orders, setOrders] = useState<OrderPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(highlightId);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('متجري');
  const [printOrder, setPrintOrder] = useState<OrderPublic | null>(null);
  const [printLabelOrder, setPrintLabelOrder] = useState<OrderPublic | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await api.get<{ success: boolean; data: OrderPublic[]; pagination: { total: number } }>(`/api/orders${params}`);
      setOrders(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch { toast.error('فشل تحميل الطلبات'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { trackPage('orders'); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<{ success: boolean; data: StorePublic }>('/api/stores/my')
      .then(r => { if (r.data?.name) setStoreName(r.data.name); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!printOrder && !printLabelOrder) return;
    const t = setTimeout(() => window.print(), 50);
    return () => clearTimeout(t);
  }, [printOrder, printLabelOrder]);

  useEffect(() => {
    const handleAfterPrint = () => { setPrintOrder(null); setPrintLabelOrder(null); };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatusType) => {
    setUpdatingId(orderId);
    try {
      const res = await api.patch<{ success: boolean; data: OrderPublic }>(`/api/orders/${orderId}/status`, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? res.data : o));
      toast.success(`تم تحديث حالة الطلب إلى: ${STATUS_AR[status]}`);
      track({ event: 'order_status_updated', meta: { status } });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'فشل التحديث'); }
    finally { setUpdatingId(null); }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <>
    <div className="p-6 max-w-5xl print:hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>الطلبات</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} طلب إجمالي</p>
        </div>
        <div className="text-left">
          <p className="text-xs text-gray-400">إجمالي الإيرادات</p>
          <p className="text-xl font-bold" style={{ color: BRAND.accent }}>{formatCurrency(totalRevenue)}</p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition"
            style={{
              background: statusFilter === f.value ? BRAND.primary : '#F5EFFA',
              color: statusFilter === f.value ? 'white' : '#6b7280',
            }}>
            {f.label}
            {f.value !== 'ALL' && (
              <span className="mr-1.5 text-xs opacity-70">
                ({orders.filter(o => f.value === 'ALL' || o.status === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND.accent }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center" style={{ borderColor: '#ECE6F0' }}>
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-200" />
          <p className="font-medium text-gray-400 mb-1">لا توجد طلبات بعد</p>
          <p className="text-sm text-gray-400">ستظهر هنا طلبات عملائك فور ورودها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isExpanded = expandedId === order.id;
            const nextStatuses = STATUS_TRANSITIONS[order.status] ?? [];
            const style = STATUS_STYLES[order.status] ?? { bg: '#F5EFFA', color: '#6b7280' };

            return (
              <div key={order.id} className="bg-white rounded-2xl border overflow-hidden transition hover:shadow-sm"
                style={{ borderColor: order.id === highlightId ? BRAND.accent : '#ECE6F0', boxShadow: order.id === highlightId ? `0 0 0 3px ${BRAND.light}` : undefined }}>
                {/* Row */}
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 text-right hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                  <div className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>

                  {/* Customer info */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{order.customerName}</span>
                      <span className="text-xs text-gray-400 hidden sm:inline">{order.customerEmail}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      #{order.id.slice(-8).toUpperCase()} · {formatDate(order.createdAt)}
                    </p>
                  </div>

                  {/* Items count */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                    <Package className="h-3.5 w-3.5" />
                    {order.items?.length ?? 0} منتج
                  </div>

                  {/* Status badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                    style={{ background: style.bg, color: style.color }}>
                    {STATUS_AR[order.status] ?? order.status}
                  </span>

                  {/* Total */}
                  <span className="font-bold flex-shrink-0" style={{ color: BRAND.primary }}>
                    {formatCurrency(order.total)}
                  </span>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-[#F5EFFA]">
                    <div className="flex items-center justify-between mt-4 mb-1">
                      <p className="text-xs font-bold" style={{ color: BRAND.secondary }}>تفاصيل الطلب</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPrintOrder(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:bg-gray-50"
                          style={{ borderColor: BRAND.light, color: BRAND.primary }}>
                          <Printer className="h-3.5 w-3.5" /> طباعة
                        </button>
                        <button onClick={() => setPrintLabelOrder(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition hover:bg-gray-50"
                          style={{ borderColor: BRAND.light, color: BRAND.primary }}>
                          <Truck className="h-3.5 w-3.5" /> بوليصة الشحن
                        </button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 mt-3">
                      {/* Items */}
                      <div>
                        <p className="text-xs font-bold mb-3" style={{ color: BRAND.secondary }}>المنتجات</p>
                        <div className="space-y-2">
                          {order.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#F5EFFA' }}>
                                {item.product?.images?.[0]
                                  ? <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={14} /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700 truncate">{item.product?.name ?? item.productId}</p>
                                <p className="text-xs text-gray-400">× {item.quantity}</p>
                                <SpecsSummary specs={item.product?.specs} />
                              </div>
                              <span className="text-sm font-medium" style={{ color: BRAND.primary }}>
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-[#F5EFFA] flex justify-between font-bold text-sm">
                            <span style={{ color: BRAND.primary }}>الإجمالي</span>
                            <span style={{ color: BRAND.accent }}>{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Customer + shipping + actions */}
                      <div>
                        <p className="text-xs font-bold mb-3" style={{ color: BRAND.secondary }}>بيانات الزبون</p>
                        <div className="space-y-1.5 mb-4 p-3 rounded-xl text-sm" style={{ background: '#F5EFFA' }}>
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.accent }} />
                            {order.customerName}
                          </div>
                          {order.customerPhone && (
                            <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 text-gray-700 hover:underline" dir="ltr" style={{ justifyContent: 'flex-end' }}>
                              {order.customerPhone}
                              <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.accent }} />
                            </a>
                          )}
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.accent }} />
                            <span className="truncate">{order.customerEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <CreditCard className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.accent }} />
                            {order.stripePaymentId ? 'مدفوع إلكترونياً' : 'الدفع عند الاستلام'}
                          </div>
                        </div>

                        <p className="text-xs font-bold mb-3" style={{ color: BRAND.secondary }}>عنوان الشحن</p>
                        <div className="flex items-start gap-2 mb-5 p-3 rounded-xl" style={{ background: '#F5EFFA' }}>
                          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: BRAND.accent }} />
                          <p className="text-sm text-gray-600 leading-relaxed">
                            <AddressBlock shippingAddress={order.shippingAddress} />
                          </p>
                        </div>

                        {/* Status update */}
                        {nextStatuses.length > 0 && (
                          <div>
                            <p className="text-xs font-bold mb-2" style={{ color: BRAND.secondary }}>تحديث الحالة</p>
                            <div className="flex flex-wrap gap-2">
                              {nextStatuses.map(s => (
                                <button key={s} onClick={() => updateStatus(order.id, s)}
                                  disabled={updatingId === order.id}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition disabled:opacity-50 hover:opacity-90"
                                  style={{
                                    background: s === 'CANCELLED' ? '#FEE2E2' : `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                                    color: s === 'CANCELLED' ? '#991B1B' : 'white',
                                  }}>
                                  {updatingId === order.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                  {NEXT_STATUS_LABEL[s] ?? s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {order.status === 'DELIVERED' && (
                          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl" style={{ background: '#D1FAE5' }}>
                            <ChevronLeft className="h-4 w-4" style={{ color: '#065F46' }} />
                            <span className="text-xs font-medium" style={{ color: '#065F46' }}>تم تسليم هذا الطلب بنجاح</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>

    {printOrder && <PrintableInvoice order={printOrder} storeName={storeName} />}
    {printLabelOrder && <PrintableShippingLabel order={printLabelOrder} storeName={storeName} />}
    </>
  );
}
