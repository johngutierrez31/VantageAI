import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'ui-button inline-flex items-center justify-center rounded-md border font-display text-xs font-medium uppercase tracking-[0.14em] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [text-shadow:1px_1px_1px_rgba(0,0,0,0.35),-1px_-1px_1px_rgba(255,255,255,0.1)]',
  {
    variants: {
      variant: {
        default:
          'border-[#b08f49] bg-[linear-gradient(180deg,#D4B872_0%,#C9A962_50%,#B8953F_100%)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.35)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.28),0_4px_12px_rgba(201,169,98,0.3)] active:translate-y-px',
        secondary:
          'border-2 border-primary bg-transparent text-primary shadow-none hover:border-[#8B2635] hover:bg-[#8B2635] hover:text-foreground hover:shadow-[0_8px_16px_rgba(0,0,0,0.3)]',
        outline:
          'border border-border bg-card text-foreground shadow-none hover:border-primary/70 hover:text-primary hover:shadow-[0_6px_18px_rgba(0,0,0,0.24)]',
        ghost:
          'border-transparent bg-transparent text-primary underline underline-offset-4 shadow-none hover:text-[#D4B872] hover:tracking-[0.18em]',
        destructive:
          'border-[#6B1D2A] bg-[linear-gradient(180deg,#A33246_0%,#8B2635_55%,#5E1924_100%)] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.38)] hover:brightness-110 hover:shadow-[0_4px_12px_rgba(139,38,53,0.35)] active:translate-y-px'
      },
      size: {
        default: 'h-12 px-8 py-2',
        sm: 'h-10 px-6',
        lg: 'h-14 px-10',
        icon: 'h-10 w-10 p-0 tracking-normal'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
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
