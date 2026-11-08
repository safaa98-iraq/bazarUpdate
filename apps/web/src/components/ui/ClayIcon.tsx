/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

/** 3D "clay" icon set shipped in /public/icons/clay (160×160 transparent WebP). */
export const CLAY_ICONS = [
  'store', 'cart', 'box', 'tag', 'badge-check', 'gift', 'discount', 'megaphone',
  'credit-card', 'shield-lock', 'shopping-bag', 'basket', 'wallet', 'coupon', 'growth', 'pie-chart',
  'user', 'users', 'storefront', 'apps', 'settings', 'bell', 'chat', 'support',
  'truck', 'location', 'calendar', 'shield-check', 'lock', 'search', 'trash', 'pencil',
  'image', 'upload', 'download', 'share', 'link', 'documents', 'qr-code', 'printer',
  'heart', 'star', 'thumbs-up', 'thumbs-down', 'refresh', 'undo', 'redo', 'send',
] as const;

export type ClayIconName = (typeof CLAY_ICONS)[number];

export function ClayIcon({
  name, size = 32, className, alt = '',
}: { name: ClayIconName; size?: number; className?: string; alt?: string }) {
  return (
    <img
      src={`/icons/clay/${name}.webp`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      loading="lazy"
      className={cn('inline-block select-none object-contain flex-shrink-0', className)}
    />
  );
}
