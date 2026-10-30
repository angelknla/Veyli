import { notFound } from 'next/navigation';
import { ChallengeCollection } from '@/features/challenges/components/Hub';
import { hub } from '@/features/game/service';
export const dynamic = 'force-dynamic';
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await hub();
  const category = data.categories.find((value) => value.slug === slug && value.available);
  if (data.available && !category) notFound();
  return (
    <div className="page-shell">
      <ChallengeCollection
        headingLevel="h1"
        data={data}
        title={category ? category.name : 'Today’s lineup'}
        initialCategory={slug}
      />
    </div>
  );
}
