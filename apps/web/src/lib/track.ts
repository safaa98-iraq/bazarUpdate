// Fire-and-forget merchant event tracker.
// Never throws — tracking must never break the UI.

type TrackEvent =
  | 'page_view'
  | 'store_created'
  | 'product_added'
  | 'product_edited'
  | 'category_added'
  | 'builder_opened'
  | 'builder_section_added'
  | 'builder_published'
  | 'settings_saved'
  | 'upgrade_clicked'
  | 'onboarding_step_completed'
  | 'order_status_updated'
  | 'coupon_created'
  | 'banner_added'
  | 'chat_sent'
  | 'brand_added'
  | 'review_submitted'
  | 'wishlist_toggled';

interface TrackPayload {
  event: TrackEvent;
  page?: string;
  meta?: Record<string, unknown>;
}

export function track(payload: TrackPayload): void {
  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('sb_token') ?? sessionStorage.getItem('sb_token')
      : null;
    if (!token) return;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {/* swallow */});
  } catch {
    // never throw
  }
}

// Convenience: track a page view on mount
export function trackPage(page: string, meta?: Record<string, unknown>): void {
  track({ event: 'page_view', page, meta });
}
