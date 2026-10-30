import { ImageResponse } from 'next/og';
import { AppIcon } from '@/components/AppIcon/AppIcon';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

const Icon = () => {
  return new ImageResponse(<AppIcon size={32} />, size);
};

export default Icon;
