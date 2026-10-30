import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { YearRangeProvider } from '@/features/challenges/components/YearRange';
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
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skipLink" href="#main">
          Skip to content
        </a>
        <YearRangeProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </YearRangeProvider>
      </body>
    </html>
  );
}
