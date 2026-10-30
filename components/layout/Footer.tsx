import Link from 'next/link';
import InstallApp from '@/components/install-app/InstallApp';
export default function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <span className="wordmark">
          VEYLI<span className="brand-dot">.</span>
        </span>
        <p>Every fandom. Every day.</p>
      </div>
      <div className="footer-links">
        <Link href="/about">How to play</Link>
        <Link href="/credits">Content & credits</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="https://rawg.io" target="_blank" rel="noreferrer">
          Game data: RAWG
        </a>
        <InstallApp />
      </div>
      <p className="footer-note">
        Your next daily obsession.
        <br />
        Daily reset at 00:00 UTC.
      </p>
    </footer>
  );
}
