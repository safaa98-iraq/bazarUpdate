'use client';

import { useEffect } from 'react';

/** Sets the browser tab title for client-component pages that can't export `metadata`. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} — بازار`;
    return () => { document.title = prev; };
  }, [title]);
}
