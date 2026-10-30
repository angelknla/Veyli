import Link from 'next/link';
import BrandMark from '@/components/BrandMark/BrandMark';
import styles from '@/components/layout/Header/Header.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';

const Header = () => {
  return (
    <header className={styles.siteHeader}>
      <Link className={styles.brandLink} href="/" aria-label="Veyli home">
        <BrandMark size={27} />
        <span className={sharedStyles.wordmark}>
          VEYLI<span className={sharedStyles.invertedDot}>.</span>
        </span>
      </Link>
      <nav className={styles.mainNav} aria-label="Main navigation">
        <Link href="/">Today</Link>
        <Link href="/categories">Categories</Link>
        <Link href="/archive">Archive</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/statistics">Statistics</Link>
      </nav>
    </header>
  );
};

export default Header;
