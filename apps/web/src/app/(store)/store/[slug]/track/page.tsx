'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

/** "Track your shipment" entry page — the customer types the code printed on the waybill. */
export default function TrackSearchPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [code, setCode] = useState('');
  return (
    <main className="min-h-screen bg-[#F6F8FA] px-4 py-16" dir="rtl">
      <form onSubmit={e => { e.preventDefault(); if (code.trim()) router.push(`/store/${slug}/track/${code.trim().toUpperCase()}`); }}
        className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-black/5 text-center">
        <h1 className="text-2xl font-bold text-gray-900">تتبع شحنتك</h1>
        <p className="text-sm text-gray-500 mt-2 mb-6">أدخل رقم التتبع المكتوب على البوليصة</p>
        <input value={code} onChange={e => setCode(e.target.value)} dir="ltr" placeholder="BZ…" className="w-full h-12 px-4 border border-gray-200 text-center tracking-widest font-bold uppercase" />
        <button className="w-full h-12 mt-3 rounded-2xl bg-gray-900 text-white font-bold flex items-center justify-center gap-2"><Search className="h-4 w-4" /> <span>تتبع</span></button>
      </form>
    </main>
  );
}
