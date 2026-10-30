export const metadata = { title: 'Privacy' };
export default function Privacy() {
  return (
    <div className="page-shell narrow-shell">
      <article className="prose-page">
        <p className="eyebrow">PLAY WITHOUT A PROFILE</p>
        <h1>Curiosity doesn’t need an account.</h1>
        <p>
          Veyli does not ask for your name, email address or password. There is no player login or
          registration.
        </p>
        <h2>What your browser keeps.</h2>
        <p>
          An essential HttpOnly cookie holds a signed random identifier, valid for up to one year.
          It connects your visits to your unfinished rounds. Scripts on the page cannot read it.
        </p>
        <p>
          Your statistics, earned achievement definitions and completed-round summaries are stored
          in this browser’s local storage. Clearing cookies, local storage or other browser data can
          lose your progress and local history. It does not carry across devices.
        </p>
        <h2>What the server keeps.</h2>
        <p>
          The server stores a keyed digest of that random identifier, guesses and confirmed results.
          These let it enforce attempts, restore games and calculate anonymous rankings. It does not
          create a user profile.
        </p>
        <p>
          Leaderboard aliases change daily and do not disclose the identifier. Short-lived, hashed
          network rate-limit records help prevent automated abuse and are removed after two hours
          during ongoing requests. Operational errors are logged with codes and request references,
          without guesses, cookie values or secret keys.
        </p>
        <h2>Images and integrations.</h2>
        <p>
          Game images are served through Veyli after checking which clues you can see. Opening a
          source or licence link takes you to that source’s website. Optional entertainment metadata
          providers are called by internal editors on the server; players do not send searches to
          those providers.
        </p>
        <h2>Local limitations.</h2>
        <p>
          This is an account-free product. Clearing browser data or using a different browser starts
          a new anonymous session. We do not offer identity recovery or account migration.
        </p>
      </article>
    </div>
  );
}
