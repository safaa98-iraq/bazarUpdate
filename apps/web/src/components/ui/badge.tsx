import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(0,122,255,0.12)] text-ios-blue',
        secondary: 'bg-[rgba(120,120,128,0.14)] text-gray-700',
        destructive: 'bg-[rgba(255,59,48,0.12)] text-[#D70015]',
        outline: 'text-gray-900 shadow-[0_0_0_0.5px_rgba(60,60,67,0.3)]',
        success: 'bg-[rgba(52,199,89,0.14)] text-[#248A3D]',
        warning: 'bg-[rgba(255,149,0,0.14)] text-[#C93400]',
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
