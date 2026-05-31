import * as React from 'react';
import { cn } from '@/lib/utils';

// Native <select> styled to look like the rest of the form.
// Simpler than Radix Select for this assignment.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 aria-invalid:border-red-500 aria-invalid:ring-1 aria-invalid:ring-red-100',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
