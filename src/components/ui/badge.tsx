import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded border px-2.5 py-1 font-display text-[10px] font-medium uppercase tracking-[0.18em] transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default:
          'border-[#b08f49] bg-[linear-gradient(180deg,#D4B872_0%,#C9A962_50%,#B8953F_100%)] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.2)]',
        muted: 'border-border bg-muted text-muted-foreground',
        success: 'border-success/40 bg-success/15 text-success',
        warning: 'border-warning/50 bg-warning/15 text-warning',
        danger:
          'border-[#6B1D2A] bg-[linear-gradient(180deg,#A33246_0%,#8B2635_55%,#5E1924_100%)] text-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
