import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import styles from '@/components/ui/Button/Button.module.css';
import { cn } from '@/lib/utils';

const variants = cva(styles.button, {
  variants: {
    variant: {
      primary: styles.buttonPrimary,
      secondary: styles.buttonSecondary,
      ghost: styles.buttonGhost,
    },
    size: { default: '', small: styles.buttonSmall },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
});
export const Button = ({
  asChild = false,
  variant,
  size,
  className,
  type = styles.button,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean }) => {
  const Component = asChild ? Slot : styles.button;
  return (
    <Component
      className={cn(variants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
};
