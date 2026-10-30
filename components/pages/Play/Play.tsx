import { notFound, redirect } from 'next/navigation';
import Game from '@/components/game/Game/Game';
import { availableRangeRound, isRangeRound } from '@/features/entertainment/range-rounds';
import { dateSchema, slugSchema } from '@/features/game/contracts';
import { hub } from '@/features/game/service';
import { getSupabase } from '@/lib/supabase/server';

const Play = async ({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ history?: string }>;
}) => {
  const { key } = await params;
  if (!slugSchema.safeParse(key).success || !dateSchema.safeParse(key.slice(0, 10)).success)
    notFound();
  const history = (await searchParams).history === '1';
  if (history) return <Game challengeKey={key} />;
  if (isRangeRound(key) && !process.env.VEYLI_INTEGRATION_DATABASE) {
    const db = getSupabase();
    if (db && !(await availableRangeRound(db, key))) notFound();
    return <Game challengeKey={key} />;
  }
  const data = await hub(key.slice(0, 10));
  const replacement = data.challenges.find((challenge) => challenge.key.startsWith(`${key}-r`));
  if (replacement) redirect(`/play/${replacement.key}`);
  if (data.available && !data.challenges.some((challenge) => challenge.key === key)) notFound();
  return <Game challengeKey={key} />;
};
export default Play;
