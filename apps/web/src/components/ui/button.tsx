import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 border-b-ink text-sm font-bold shadow-brut transition-[transform,box-shadow] duration-75 hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#0A0A0A] active:translate-x-1 active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[4px_4px_0_#2342FF] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'bg-b-yellow text-b-ink',
        destructive: 'bg-b-red text-white',
        outline: 'bg-white text-b-ink',
        secondary: 'bg-b-ink text-white',
        ghost: 'border-transparent shadow-none bg-transparent text-b-ink hover:bg-b-yellow hover:shadow-none hover:translate-x-0 hover:translate-y-0',
        link: 'border-transparent shadow-none bg-transparent text-b-blue underline decoration-2 underline-offset-4 hover:shadow-none',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-14 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
