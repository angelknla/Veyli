'use client';
const ErrorPage = ({ reset }: { reset: () => void }) => {
  return (
    <section>
      <h1>Something went wrong</h1>
      <p>Please try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
};
export default ErrorPage;
