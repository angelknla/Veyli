import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = cva('button', {
  variants: {
    variant: { primary: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost' },
    size: { default: '', small: 'button-small' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
});
export function Button({
  asChild = false,
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(variants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
