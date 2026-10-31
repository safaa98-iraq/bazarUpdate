import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-11 w-full border-2 border-b-ink bg-white px-3 py-2 text-[15px] text-b-ink file:border-0 file:bg-transparent file:text-sm file:font-bold placeholder:font-mono placeholder:text-gray-400 focus-visible:outline-none focus-visible:shadow-[4px_4px_0_#2342FF] disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
