import { notFound, redirect } from 'next/navigation';
import { availableRangeRound, isRangeRound } from '@/features/entertainment/range-rounds';
import Game from '@/features/game/components/Game';
import { dateSchema, slugSchema } from '@/features/game/contracts';
import { hub } from '@/features/game/service';
import { getSupabase } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'The daily mystery' };
export default async function Play({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ history?: string }>;
}) {
  const { key } = await params;
  if (!slugSchema.safeParse(key).success || !dateSchema.safeParse(key.slice(0, 10)).success)
    notFound();
  const data = await hub(key.slice(0, 10));
  const history = (await searchParams).history === '1';
  const replacement = data.challenges.find((challenge) => challenge.key.startsWith(`${key}-r`));
  if (replacement && !history) redirect(`/play/${replacement.key}`);
  if (!history && data.available && !data.challenges.some((challenge) => challenge.key === key)) {
    const db = isRangeRound(key) && !process.env.VEYLI_INTEGRATION_DATABASE ? getSupabase() : null;
    if (!db || !(await availableRangeRound(db, key))) notFound();
  }
  return <Game challengeKey={key} />;
}
