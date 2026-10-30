import LoadingImage from '@/components/LoadingImage/LoadingImage';
import styles from '@/components/pages/Credits/Credits.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';

const Credits = () => {
  return (
    <div className={sharedStyles.pageShell}>
      <header className={sharedStyles.pageHeading}>
        <p className={sharedStyles.eyebrow}>THE PEOPLE BEHIND THE PICTURES</p>
        <h1>Credit where it’s due.</h1>
        <p>
          Movie, TV and game puzzles use attributed provider images. Music and Pop Culture use
          open-licensed Wikimedia media. Each completed challenge includes its image sources and
          licence details.
        </p>
      </header>
      <div className={styles.creditsList}>
        <article className={styles.creditEntry}>
          <h2>Europa Cinema Auditorium, February 2025</h2>
          <p>City of Zagreb · CC BY 4.0</p>
          <p>Homepage photograph resized to 1800px and compressed as JPEG.</p>
          <a
            href="https://commons.wikimedia.org/wiki/File:Europa_Cinema_Auditorium,_February_2025.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Original & attribution
          </a>
          <a href="https://creativecommons.org/licenses/by/4.0" target="_blank" rel="noreferrer">
            Licence terms
          </a>
        </article>
      </div>
      <article className={sharedStyles.prosePage}>
        <a href="https://www.themoviedb.org" aria-label="The Movie Database">
          <LoadingImage
            src="/tmdb.svg"
            alt="TMDB"
            width={120}
            height={16}
            unoptimized
            fallback={<span>TMDB</span>}
          />
        </a>
        <h2>Words, type & metadata.</h2>
        <p>
          Existing Nosferatu Quote rounds use a Veyli translation of Henrik Galeen’s 1922 German
          intertitle for <em>Nosferatu</em>. The original work is in the public domain in the UK;
          Veyli’s translation is dedicated under{' '}
          <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>. Catalogue
          descriptions are original summaries of factual metadata, with source links in each result.
        </p>
        <p>
          Manrope by Mikhail Sharanda is distributed under the SIL Open Font License. Veyli’s mark
          and interface artwork are original.
        </p>
        <p>
          Movie and TV data and images are supplied by <a href="https://www.themoviedb.org">TMDB</a>{' '}
          under its non-commercial API terms. This product uses the TMDB API but is not endorsed or
          certified by TMDB. Game data and screenshots are supplied by{' '}
          <a href="https://rawg.io">RAWG</a>. Music facts use{' '}
          <a href="https://musicbrainz.org">MusicBrainz</a> and{' '}
          <a href="https://www.wikidata.org">Wikidata</a>; artist and character images use{' '}
          <a href="https://commons.wikimedia.org">Wikimedia Commons</a> with recorded attribution.
        </p>
        <p>
          Public-domain and Creative Commons declarations are recorded from the linked source.
          Content editors must confirm rights for their intended distribution territories before
          publishing additional media.
        </p>
      </article>
    </div>
  );
};
export default Credits;
