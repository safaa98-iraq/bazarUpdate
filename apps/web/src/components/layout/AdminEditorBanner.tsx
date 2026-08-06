'use client';

import { useEditorStore } from '@/lib/stores/editor.store';
import { PenSquare, X } from 'lucide-react';

export function AdminEditorBanner() {
  const { isEditorMode, editingStore, exitEditorMode } = useEditorStore();

  if (!isEditorMode || !editingStore) return null;

  return (
    <div style={{ width: '100%', background: 'linear-gradient(90deg,#DB6E93,#2F2E4B)', color: '#fff', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PenSquare size={15} />
        <span>
          أنت تعدّل متجر <strong>{editingStore.name}</strong> كمشرف — كل التغييرات مسجّلة
        </span>
      </div>
      <button
        onClick={exitEditorMode}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#fff', fontSize: 12, fontFamily: 'inherit' }}
      >
        <X size={13} /> خروج
      </button>
    </div>
  );
}
