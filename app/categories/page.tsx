import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import LoadingImage from '@/components/LoadingImage';
import { CategoryIcon } from '@/features/challenges/components/Hub';
import { hub } from '@/features/game/service';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Categories' };
export default async function Categories() {
  const data = await hub();
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">PICK YOUR WORLD</p>
        <h1>Pick your universe.</h1>
      </header>
      {data.categories.length ? (
        <div className="category-grid">
          {data.categories.map((category, index) => {
            const preview = data.challenges.find(
              (challenge) =>
                challenge.category.slug === category.slug && challenge.mode.slug === 'one-frame'
            );
            const content = (
              <>
                {preview && (
                  <LoadingImage
                    src={preview.previewUrl || `/api/challenges/${preview.key}/preview`}
                    alt=""
                    fill
                    frameClassName="category-image"
                    sizes="(max-width: 600px) 92vw, (max-width: 850px) 45vw, 30vw"
                    loading={index < 2 ? 'eager' : 'lazy'}
                    fallback={<span aria-hidden="true" />}
                  />
                )}
                <CategoryIcon name={category.icon} size={31} />
                <h2>{category.name}</h2>
                <span className={category.available ? 'text-link' : 'eyebrow'}>
                  {category.available ? (
                    <>
                      Play challenges <ArrowUpRight size={17} />
                    </>
                  ) : (
                    'COMING SOON'
                  )}
                </span>
              </>
            );
            return category.available ? (
              <Link
                key={category.slug}
                className="category-card"
                href={`/categories/${category.slug}`}
              >
                {content}
              </Link>
            ) : (
              <section key={category.slug} className="category-card unavailable">
                {content}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>The worlds are getting ready.</h2>
          <p>The catalogue is temporarily unavailable. Please return shortly.</p>
        </div>
      )}
    </div>
  );
}
