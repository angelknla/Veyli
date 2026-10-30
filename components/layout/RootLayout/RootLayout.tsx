import type { ReactNode } from 'react';
import { YearRangeProvider } from '@/components/challenges/YearRange/YearRange';
import Footer from '@/components/layout/Footer/Footer';
import Header from '@/components/layout/Header/Header';
import styles from '@/components/layout/RootLayout/RootLayout.module.css';

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <a className={styles.skipLink} href="#main">
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
};
export default RootLayout;
