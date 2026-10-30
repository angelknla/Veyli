import Link from 'next/link';
import InstallApp from '@/components/install-app/InstallApp';
import styles from '@/components/layout/Footer/Footer.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { cn } from '@/lib/utils';

const Footer = () => {
  return (
    <footer className={styles.siteFooter}>
      <div>
        <span className={cn(sharedStyles.wordmark, styles.wordmark)}>
          VEYLI<span className={sharedStyles.brandDot}>.</span>
        </span>
        <p>Every fandom. Every day.</p>
      </div>
      <div className={styles.footerLinks}>
        <Link href="/about">How to play</Link>
        <Link href="/credits">Content & credits</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="https://rawg.io" target="_blank" rel="noreferrer">
          Game data: RAWG
        </a>
        <InstallApp />
      </div>
      <p className={styles.footerNote}>
        Your next daily obsession.
        <br />
        Daily reset at 00:00 UTC.
      </p>
    </footer>
  );
};

export default Footer;
