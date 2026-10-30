import { notFound } from 'next/navigation';
import { ChallengeCollection } from '@/components/challenges/Hub/Hub';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { hub } from '@/features/game/service';

const CategoryPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const data = await hub();
  const category = data.categories.find((value) => value.slug === slug && value.available);
  if (data.available && !category) notFound();
  return (
    <div className={sharedStyles.pageShell}>
      <ChallengeCollection
        headingLevel="h1"
        data={data}
        title={category ? category.name : 'Today’s lineup'}
        initialCategory={slug}
      />
    </div>
  );
};
export default CategoryPage;
