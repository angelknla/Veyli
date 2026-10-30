import { Fragment } from 'react';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';

/** Headline copy carries the brand's red full stop, the way the wordmark used to. */
export const Dotted = ({ children }: { children: string }) => {
  const parts = children.split('.');
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <span className={sharedStyles.brandDot}>.</span>}
        </Fragment>
      ))}
    </>
  );
};
