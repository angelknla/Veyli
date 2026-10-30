import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
export default function Header() {
  return (
    <header className="site-header">
      <Link className="brand-link" href="/" aria-label="Veyli home">
        <BrandMark size={27} />
        <span className="wordmark">
          VEYLI<span className="brand-dot">.</span>
        </span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link href="/today">Today</Link>
        <Link href="/categories">Categories</Link>
        <Link href="/archive">Archive</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/statistics">Statistics</Link>
      </nav>
    </header>
  );
}
