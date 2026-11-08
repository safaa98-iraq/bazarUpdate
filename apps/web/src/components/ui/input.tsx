import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-11 w-full rounded-xl border border-bz-line bg-white px-3.5 py-2 text-[15px] text-bz-ink file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-bz-muted focus-visible:outline-none focus-visible:border-bz-brand focus-visible:ring-4 focus-visible:ring-bz-brand/15 disabled:cursor-not-allowed disabled:bg-bz-bg disabled:opacity-60',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
