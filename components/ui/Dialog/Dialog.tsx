'use client';

import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from '@/components/ui/Dialog/Dialog.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { cn } from '@/lib/utils';
export const Dialog = ({
  title,
  description,
  trigger,
  children,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Overlay className={styles.dialogOverlay} />
        <Primitive.Content className={styles.dialogContent}>
          <Primitive.Title className={styles.dialogTitle}>{title}</Primitive.Title>
          <Primitive.Description className={cn(sharedStyles.muted, styles.muted)}>
            {description}
          </Primitive.Description>
          {children}
          <Primitive.Close className={styles.dialogClose} aria-label="Close dialog">
            <X size={20} />
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
};
