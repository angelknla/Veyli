'use client';
import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Dialog({
  title,
  description,
  trigger,
  children,
}: {
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Overlay className="dialog-overlay" />
        <Primitive.Content className="dialog-content">
          <Primitive.Title className="dialog-title">{title}</Primitive.Title>
          <Primitive.Description className="muted">{description}</Primitive.Description>
          {children}
          <Primitive.Close className="dialog-close" aria-label="Close dialog">
            <X size={20} />
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
