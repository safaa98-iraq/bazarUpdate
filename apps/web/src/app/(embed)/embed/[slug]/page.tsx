'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, X, ArrowLeft, Plus, Minus, Trash2, CheckCircle, Loader2, Package } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Product {
  id: string; name: string; description: string | null;
  price: number; comparePrice: number | null;
  images: string[]; stock: number;
  category?: { name: string } | null;
}
interface CartItem { product: Product; quantity: number }
interface ShippingForm {
  customerName: string; customerEmail: string;
  line1: string; city: string; state: string; postalCode: string; country: string;
}

type View = 'products' | 'product' | 'cart' | 'checkout' | 'success';

function fmt(n: number) { return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(n); }

export default function EmbedPage() {
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();
  const initProduct = searchParams.get('product');
  const theme = searchParams.get('theme') ?? 'light';

  const [view, setView] = useState<View>(initProduct ? 'product' : 'products');
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ShippingForm>({
    customerName: '', customerEmail: '', line1: '', city: '', state: '', postalCode: '', country: 'SA',
  });

  const accent = theme === 'dark' ? '#818cf8' : '#6366f1';
  const bg = theme === 'dark' ? '#111827' : '#ffffff';
  const text = theme === 'dark' ? '#f9fafb' : '#111827';
  const subtle = theme === 'dark' ? '#374151' : '#f3f4f6';

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const close = useCallback(() => window.parent.postMessage('sb:close', '*'), []);

  // Load products
  useEffect(() => {
    fetch(`${API}/api/widget/${slug}/products`)
      .then(r => r.json())
      .then(r => {
        setProducts(r.data ?? []);
        if (initProduct) {
          const p = (r.data ?? []).find((x: Product) => x.id === initProduct);
          if (p) setSelected(p);
        }
      })
      .catch(() => setError('Failed to load products'))
      .finally(() => setLoading(false));
  }, [slug, initProduct]);

  function openProduct(p: Product) { setSelected(p); setQty(1); setView('product'); }
  function addToCart(p: Product, q: number) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + q } : i);
      return [...prev, { product: p, quantity: q }];
    });
    setView('cart');
  }
  function removeFromCart(productId: string) { setCart(prev => prev.filter(i => i.product.id !== productId)); }
  function updateQty(productId: string, delta: number) {
    setCart(prev => prev.map(i => i.product.id === productId
      ? { ...i, quantity: Math.max(1, Math.min(i.product.stock, i.quantity + delta)) }
      : i).filter(i => i.quantity > 0));
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/api/widget/${slug}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          shippingAddress: { line1: form.line1, city: form.city, state: form.state, postalCode: form.postalCode, country: form.country },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Order failed');
      setOrderId(data.data.id);
      setCart([]);
      setView('success');
      window.parent.postMessage({ type: 'sb:order-complete', order: data.data }, '*');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally { setSubmitting(false); }
  }

  const panelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100vh', background: bg, color: text };
  const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${subtle}`, flexShrink: 0 };
  const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, color: text, display: 'flex', alignItems: 'center' };
  const body: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '16px' };
  const primaryBtn: React.CSSProperties = { width: '100%', padding: '12px', background: accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer' };

  if (loading) return (
    <div style={{ ...panelStyle, alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 style={{ animation: 'spin 1s linear infinite', color: accent }} size={32} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (view === 'success') return (
    <div style={{ ...panelStyle, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
      <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 20 }} />
      <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>تم استلام طلبك!</h2>
      <p style={{ margin: '0 0 8px', color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 14 }}>رقم الطلب</p>
      <p style={{ margin: '0 0 24px', fontWeight: 700, fontSize: 16, color: accent }}>{orderId}</p>
      <button style={{ ...primaryBtn, width: 'auto', padding: '10px 28px' }} onClick={close}>إغلاق</button>
    </div>
  );

  // ── CHECKOUT ──────────────────────────────────────────────────────────────
  if (view === 'checkout') return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <button style={iconBtn} onClick={() => setView('cart')}><ArrowLeft size={18} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>إتمام الطلب</span>
        <button style={iconBtn} onClick={close}><X size={18} /></button>
      </div>
      <form onSubmit={handleCheckout} style={{ ...body, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'الاسم الكامل', key: 'customerName', type: 'text', placeholder: 'محمد أحمد' },
          { label: 'البريد الإلكتروني', key: 'customerEmail', type: 'email', placeholder: 'example@email.com' },
          { label: 'العنوان', key: 'line1', type: 'text', placeholder: 'شارع الملك فهد، بناية 5' },
          { label: 'المدينة', key: 'city', type: 'text', placeholder: 'الرياض' },
          { label: 'المنطقة', key: 'state', type: 'text', placeholder: 'الرياض' },
          { label: 'الرمز البريدي', key: 'postalCode', type: 'text', placeholder: '12345' },
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>{label}</label>
            <input
              required type={type} placeholder={placeholder}
              value={form[key as keyof ShippingForm]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${subtle}`, borderRadius: 10, background: bg, color: text, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        ))}
        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}
        <div style={{ marginTop: 8, padding: '12px 0', borderTop: `1px solid ${subtle}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            <span>الإجمالي</span><span style={{ color: accent }}>{fmt(cartTotal)}</span>
          </div>
          <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'جارٍ تأكيد الطلب…' : `تأكيد الطلب — ${fmt(cartTotal)}`}
          </button>
        </div>
      </form>
    </div>
  );

  // ── CART ──────────────────────────────────────────────────────────────────
  if (view === 'cart') return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <button style={iconBtn} onClick={() => setView('products')}><ArrowLeft size={18} /></button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>سلة التسوق ({cartCount})</span>
        <button style={iconBtn} onClick={close}><X size={18} /></button>
      </div>
      <div style={body}>
        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: theme === 'dark' ? '#6b7280' : '#9ca3af' }}>
            <ShoppingCart size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>السلة فارغة</p>
            <button style={{ ...primaryBtn, marginTop: 16, width: 'auto', padding: '10px 24px' }} onClick={() => setView('products')}>تصفح المنتجات</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cart.map(item => (
              <div key={item.product.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 10, background: subtle }}>
                <div style={{ width: 64, height: 64, borderRadius: 10, background: '#e5e7eb', overflow: 'hidden', flexShrink: 0 }}>
                  {item.product.images[0]
                    ? <img src={item.product.images[0]} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={24} color="#9ca3af" /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14 }}>{item.product.name}</p>
                  <p style={{ margin: '0 0 8px', color: accent, fontWeight: 700 }}>{fmt(item.product.price)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => updateQty(item.product.id, -1)} style={{ ...iconBtn, width: 28, height: 28, borderRadius: 10, background: bg }}><Minus size={12} /></button>
                    <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} style={{ ...iconBtn, width: 28, height: 28, borderRadius: 10, background: bg }}><Plus size={12} /></button>
                    <button onClick={() => removeFromCart(item.product.id)} style={{ ...iconBtn, marginRight: 'auto', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div style={{ padding: '16px', borderTop: `1px solid ${subtle}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            <span>الإجمالي</span><span style={{ color: accent }}>{fmt(cartTotal)}</span>
          </div>
          <button style={primaryBtn} onClick={() => setView('checkout')}>إتمام الشراء ←</button>
        </div>
      )}
    </div>
  );

  // ── PRODUCT DETAIL ────────────────────────────────────────────────────────
  if (view === 'product' && selected) return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <button style={iconBtn} onClick={() => setView('products')}><ArrowLeft size={18} /></button>
        <button style={{ ...iconBtn, position: 'relative' }} onClick={() => setView('cart')}>
          <ShoppingCart size={20} />
          {cartCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: accent, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>}
        </button>
        <button style={iconBtn} onClick={close}><X size={18} /></button>
      </div>
      <div style={body}>
        <div style={{ aspectRatio: '1/1', borderRadius: 10, background: subtle, overflow: 'hidden', marginBottom: 16 }}>
          {selected.images[0]
            ? <img src={selected.images[0]} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><Package size={64} /></div>}
        </div>
        {selected.category && <p style={{ margin: '0 0 6px', fontSize: 12, color: accent, fontWeight: 600 }}>{selected.category.name}</p>}
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>{fmt(selected.price)}</span>
          {selected.comparePrice && <span style={{ fontSize: 16, textDecoration: 'line-through', color: '#9ca3af' }}>{fmt(selected.comparePrice)}</span>}
          {selected.comparePrice && <span style={{ background: '#fef2f2', color: '#ef4444', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>
            {Math.round((1 - selected.price / selected.comparePrice) * 100)}% خصم
          </span>}
        </div>
        {selected.description && <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.7, color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>{selected.description}</p>}
        <p style={{ margin: '0 0 16px', fontSize: 13, color: selected.stock > 0 ? '#10b981' : '#ef4444' }}>
          {selected.stock > 0 ? `✓ متوفر (${selected.stock} قطعة)` : '✗ غير متوفر'}
        </p>
        {selected.stock > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>الكمية</span>
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${subtle}`, borderRadius: 8 }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ ...iconBtn, padding: '8px 12px' }}><Minus size={14} /></button>
                <span style={{ padding: '0 12px', fontWeight: 600 }}>{qty}</span>
                <button onClick={() => setQty(Math.min(selected.stock, qty + 1))} style={{ ...iconBtn, padding: '8px 12px' }}><Plus size={14} /></button>
              </div>
            </div>
            <button style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => addToCart(selected, qty)}>أضف إلى السلة <ShoppingCart size={16} /></button>
          </>
        )}
      </div>
    </div>
  );

  // ── PRODUCT GRID ──────────────────────────────────────────────────────────
  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>المتجر</span>
        <button style={{ ...iconBtn, position: 'relative' }} onClick={() => setView('cart')}>
          <ShoppingCart size={20} />
          {cartCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, background: accent, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>}
        </button>
        <button style={iconBtn} onClick={close}><X size={18} /></button>
      </div>
      <div style={{ ...body, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
        {products.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', paddingTop: 60, color: '#9ca3af' }}>
            <Package size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>لا توجد منتجات</p>
          </div>
        ) : products.map(p => (
          <button key={p.id} onClick={() => openProduct(p)}
            style={{ background: subtle, border: 'none', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', textAlign: 'right', padding: 0, color: text }}>
            <div style={{ aspectRatio: '1/1', background: theme === 'dark' ? '#1f2937' : '#e5e7eb', overflow: 'hidden' }}>
              {p.images[0]
                ? <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={32} color="#9ca3af" /></div>}
            </div>
            <div style={{ padding: '10px 10px 12px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: accent }}>{fmt(p.price)}</p>
              {p.comparePrice && <p style={{ margin: 0, fontSize: 11, textDecoration: 'line-through', color: '#9ca3af' }}>{fmt(p.comparePrice)}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
