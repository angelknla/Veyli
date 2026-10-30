import { ImageResponse } from 'next/og';
import { AppIcon } from '@/components/AppIcon/AppIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const AppleIcon = () => {
  return new ImageResponse(<AppIcon size={180} />, size);
};

export default AppleIcon;
