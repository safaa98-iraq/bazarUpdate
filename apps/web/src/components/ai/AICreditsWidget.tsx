'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { AICredits } from '@storebuilder/types';

export function AICreditsWidget() {
  const [credits, setCredits] = useState<AICredits | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: AICredits }>('/api/ai/credits')
      .then((r) => setCredits(r.data))
      .catch(() => null);
  }, []);

  if (!credits) return null;

  const pct = Math.round((credits.remaining / credits.limit) * 100);
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-indigo-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">رصيد الذكاء الاصطناعي</span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-bold text-indigo-700">{credits.remaining}</span>
        <span className="text-xs text-gray-500">من {credits.limit} طلب/يوم</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {credits.remaining === 0 && (
        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          تم استنفاد الرصيد اليومي. يتجدد الرصيد منتصف الليل.
        </p>
      )}
    </div>
  );
}
