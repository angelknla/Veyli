import { ImageResponse } from 'next/og';
import { AppIcon } from '@/components/AppIcon/AppIcon';

export const GET = async (_request: Request, { params }: { params: Promise<{ size: string }> }) => {
  const { size } = await params;
  if (size !== '192' && size !== '512') return new Response('Not found', { status: 404 });
  const dimension = Number(size);
  return new ImageResponse(<AppIcon size={dimension} />, {
    width: dimension,
    height: dimension,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
};
