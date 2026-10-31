import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-[15px] font-semibold transition-all duration-200 ease-[cubic-bezier(.32,.72,0,1)] active:scale-[0.97] active:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ios-blue/20 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-ios-blue text-white hover:brightness-110',
        destructive: 'bg-ios-red/10 text-ios-red hover:bg-ios-red/15',
        outline: 'bg-white text-ios-blue shadow-[0_0_0_0.5px_rgba(60,60,67,0.2)] hover:bg-gray-50',
        secondary: 'bg-ios-blue/10 text-ios-blue hover:bg-ios-blue/15',
        ghost: 'text-ios-blue hover:bg-ios-fill',
        link: 'text-ios-blue underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-8 rounded-full px-3.5 text-[13px]',
        lg: 'h-[50px] rounded-[14px] px-8 text-[17px]',
        icon: 'h-10 w-10 rounded-full',
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
