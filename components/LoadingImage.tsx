'use client';

import Image, { type ImageLoaderProps, type ImageProps } from 'next/image';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = Omit<ImageProps, 'loader' | 'onLoad' | 'onError'> & {
  frameClassName?: string;
  fallback?: ReactNode;
};

// Direct URLs keep player cookies attached; the server controls all clue transformations.
function clueLoader({ src, width }: ImageLoaderProps) {
  return `${src}${src.includes('?') ? '&' : '?'}w=${Math.min(1200, Math.max(256, width))}`;
}

export default function LoadingImage(props: Props) {
  return (
    <ImageFrame
      key={typeof props.src === 'string' ? props.src : JSON.stringify(props.src)}
      {...props}
    />
  );
}

function ImageFrame({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  frameClassName = '',
  fallback,
  ...props
}: Props) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [retry, setRetry] = useState(0);
  return (
    <span
      className={`image-frame ${fill ? 'image-frame-fill' : ''} ${frameClassName}`}
      style={fill ? undefined : { width, maxWidth: '100%', aspectRatio: `${width} / ${height}` }}
      data-loading={status === 'loading'}
      aria-busy={status === 'loading'}
    >
      {status === 'loading' && <span className="image-skeleton" aria-hidden="true" />}
      {status === 'failed' ? (
        fallback || (
          <span className="image-error">
            <span role="alert">The image could not load.</span>
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('loading');
                setRetry(retry + 1);
              }}
            >
              Retry image
            </Button>
          </span>
        )
      ) : (
        <Image
          {...props}
          key={retry}
          src={src}
          alt={alt}
          fill
          sizes={sizes || (width ? `${width}px` : '100vw')}
          loader={typeof src === 'string' && src.startsWith('/api/') ? clueLoader : undefined}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      )}
    </span>
  );
}
