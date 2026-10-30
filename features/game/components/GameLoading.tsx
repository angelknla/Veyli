import { LoaderCircle } from 'lucide-react';

export default function GameLoading() {
  return (
    <div className="game-loading" role="status">
      <LoaderCircle className="spin" size={28} aria-hidden="true" />
      <p>Setting the scene…</p>
    </div>
  );
}
