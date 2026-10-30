import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
export const metadata: Metadata = {
  title: { default: 'Veyli — Press play. Prove it.', template: '%s · Veyli' },
  description:
    'Daily movie, TV, gaming, music and pop-culture challenges. Play without an account.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Veyli', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { themeColor: '#090909' };
export const maxDuration = 300;

import RootLayout from '@/components/layout/RootLayout/RootLayout';
export default RootLayout;
