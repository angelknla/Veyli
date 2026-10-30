import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import CategoryIcon from '@/components/challenges/CategoryIcon/CategoryIcon';
import styles from '@/components/pages/Categories/Categories.module.css';
import { Dotted } from '@/components/ui/Dotted/Dotted';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { categories } from '@/features/game/service';
import { cn } from '@/lib/utils';

const Categories = async () => {
  const data = await categories();
  return (
    <div className={sharedStyles.pageShell}>
      <header className={sharedStyles.pageHeading}>
        <p className={cn(sharedStyles.eyebrow, styles.eyebrow)}>PICK YOUR WORLD</p>
        <h1>
          <Dotted>Pick your universe.</Dotted>
        </h1>
      </header>
      {data.length ? (
        <div className={styles.categoryGrid}>
          {data.map((category) => {
            const content = (
              <>
                <div className={styles.categoryArt} data-testid="category-art" aria-hidden="true">
                  <CategoryIcon name={category.icon} size={140} />
                </div>
                <h2>{category.name}</h2>
                <span
                  className={
                    category.available
                      ? cn(sharedStyles.textLink, styles.textLink)
                      : cn(sharedStyles.eyebrow, styles.eyebrow)
                  }
                >
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
                className={styles.categoryCard}
                data-testid="category-card"
                href={`/categories/${category.slug}`}
              >
                {content}
              </Link>
            ) : (
              <section
                key={category.slug}
                className={cn(styles.categoryCard, styles.unavailable)}
                data-testid="category-card unavailable"
              >
                {content}
              </section>
            );
          })}
        </div>
      ) : (
        <div className={sharedStyles.emptyState}>
          <h2>
            <Dotted>The worlds are getting ready.</Dotted>
          </h2>
          <p>The catalogue is temporarily unavailable. Please return shortly.</p>
        </div>
      )}
    </div>
  );
};
export default Categories;
