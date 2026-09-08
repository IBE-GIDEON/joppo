'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // The one place colour is spent, so it gets the glow.
        primary:
          'bg-iris-600 text-white shadow-[0_0_0_1px_rgba(124,92,255,0.45),0_6px_22px_-6px_rgba(96,57,245,0.85)] hover:bg-iris-500 hover:shadow-[0_0_0_1px_rgba(155,135,255,0.6),0_10px_34px_-6px_rgba(124,92,255,1)]',
        secondary:
          'border border-white/[0.12] bg-white/[0.045] text-white/85 hover:border-white/25 hover:bg-white/[0.08] hover:text-white',
        ghost: 'text-white/55 hover:bg-white/[0.06] hover:text-white',
        link: 'text-white/70 underline-offset-4 hover:text-white hover:underline',
        outline:
          'border border-white/[0.14] bg-transparent text-white/75 hover:border-white/30 hover:bg-white/[0.05] hover:text-white',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-5',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
