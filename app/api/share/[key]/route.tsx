import { ImageResponse } from 'next/og';
import { slugSchema } from '@/features/game/contracts';
import { engine } from '@/features/game/service';
import { apiError, json, privateHeaders, rateLimit } from '@/lib/http';
import { playerIdentity } from '@/lib/security/player';
export const GET = async (request: Request, { params }: { params: Promise<{ key: string }> }) => {
  try {
    const key = slugSchema.parse((await params).key);
    const player = await playerIdentity(false);
    if (!player) return json({ error: 'not_found' }, 404);
    await rateLimit(request, 'share', player);
    const state = await engine.open(player, key);
    if (state.status === 'in_progress') return json({ error: 'finish_game_first' }, 409);
    const spoiler = new URL(request.url).searchParams.get('spoiler') === 'true';
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#090909',
          color: '#f5f5f5',
          padding: 68,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -3 }}>
            VEYLI<span style={{ color: '#ff3045' }}>.</span>
          </span>
          <span style={{ fontSize: 20, color: '#b6b6bf' }}>
            {state.challenge.category.name} / {state.challenge.mode.name} / #
            {state.challenge.number}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 62, fontWeight: 700 }}>
            {state.status === 'won' ? 'Mystery solved.' : 'Next round?'}
          </span>
          <span style={{ fontSize: 25, color: '#b6b6bf' }}>
            {spoiler ? `${state.answer?.title} (${state.answer?.year})` : 'Press play. Prove it.'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {Array.from({ length: state.challenge.attemptLimit }, (_, index) => (
            <div
              key={index}
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                background:
                  index < state.attemptsUsed
                    ? state.status === 'won' && index === state.attemptsUsed - 1
                      ? '#ff3045'
                      : '#555555'
                    : '#242424',
              }}
            />
          ))}
          <span style={{ marginLeft: 24, fontSize: 34 }}>{state.score.toLocaleString()} pts</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 19,
            color: '#b6b6bf',
          }}
        >
          <span>
            {state.challenge.releaseDate} · {state.attemptsUsed}/{state.challenge.attemptLimit}{' '}
            guesses
          </span>
          <span>Play without an account.</span>
        </div>
      </div>,
      { width: 1200, height: 630, headers: privateHeaders }
    );
  } catch (error) {
    return apiError(error);
  }
};
