'use client';

import { create } from 'zustand';

interface EditorState {
  isEditorMode: boolean;
  editingStore: { id: string; name: string } | null;
  enterEditorMode: (store: { id: string; name: string }) => void;
  exitEditorMode: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  isEditorMode: false,
  editingStore: null,
  enterEditorMode: (store) => set({ isEditorMode: true, editingStore: store }),
  exitEditorMode: () => set({ isEditorMode: false, editingStore: null }),
}));
