import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border-2 border-b-ink px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-b-blue text-white',
        secondary: 'bg-b-paper2 text-b-ink',
        destructive: 'bg-b-red text-white',
        outline: 'bg-white text-b-ink',
        success: 'bg-b-green text-white',
        warning: 'bg-b-yellow text-b-ink',
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
