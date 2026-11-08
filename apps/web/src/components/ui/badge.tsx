import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-bz-brand-100 text-bz-brand-600',
        secondary: 'bg-bz-bg text-bz-ink-2',
        destructive: 'bg-[#FDECEC] text-[#C93636]',
        outline: 'border border-bz-line text-bz-ink',
        success: 'bg-[#E2F7EE] text-[#17845C]',
        warning: 'bg-[#FEF3E2] text-[#B45309]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
