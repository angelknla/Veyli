import Link from 'next/link';
export const metadata = { title: 'How to play' };
export default function About() {
  return (
    <div className="page-shell narrow-shell">
      <article className="prose-page">
        <p className="eyebrow">A LITTLE MYSTERY. EVERY DAY.</p>
        <h1>Trust that familiar feeling.</h1>
        <p>
          Veyli is a daily entertainment guessing game. You already know more than you think. We
          give you a clue; you find the story, show or world behind it.
        </p>
        <h2>Pick a way to play.</h2>
        <ul>
          <li>
            <strong>Classic:</strong> keep a frame on screen. Each miss adds a fact such as year,
            genre, director or cast.
          </li>
          <li>
            <strong>One Frame:</strong> one image with a black rectangle in its centre. Each miss
            shrinks the rectangle.
          </li>
          <li>
            <strong>Poster:</strong> promotional artwork with a different perspective. It starts
            blurred and becomes clearer with each miss.
          </li>
          <li>
            <strong>Quote:</strong> identify the source of a line. Contextual hints may follow a
            wrong guess. These rounds use curated, licensed lines.
          </li>
        </ul>
        <p>
          Every game gives you eight guesses. Fewer guesses earn more points. Choose a title from
          the search suggestions; release years help distinguish remakes. Press Enter to select and
          submit. Filter available puzzles by release-year range.
        </p>
        <h2>Everyone gets the same mystery.</h2>
        <p>
          A fresh edit arrives at 00:00 UTC. Previous days are in the archive. Future rounds remain
          hidden, and a completed round cannot score again.
        </p>
        <h2>No account. No interruption.</h2>
        <p>
          Your anonymous browser session saves the round as you play. Personal statistics and
          achievements stay on this device. Clearing browser data can lose that history.
        </p>
        <h2>Share the discovery, keep the mystery.</h2>
        <p>
          Your result can be copied, shared or downloaded as a branded image. It leaves out the
          answer unless you choose the spoiler option.
        </p>
        <p>
          <Link href="/today">Find today’s mystery →</Link>
        </p>
      </article>
    </div>
  );
}
