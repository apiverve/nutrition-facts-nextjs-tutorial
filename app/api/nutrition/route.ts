import { callApi, fail, fromCache, guard, respond, str, toCache } from '@/lib/apiverve';

// Food data rarely changes, so answers are cached for a day.
// The order matters: answer from the cache first (free, no rate limit), then guard, then spend credits.
const TTL_MS = 24 * 60 * 60_000;

/** GET /api/nutrition?food=...: nutrition per 100 g, with serving sizes, from the Nutrition API. */
export async function GET(request: Request) {
  const food = str(new URL(request.url).searchParams.get('food'), 60).toLowerCase();
  if (!food) return fail('Type a food, like “banana” or “brown rice”');
  if (!/^[\p{L}0-9' ,.&-]+$/u.test(food)) return fail('Use letters and spaces only');

  const key = `nutrition:${food}`;
  const hit = fromCache(key, TTL_MS);
  if (hit) return Response.json(hit);

  const blocked = guard(request);
  if (blocked) return blocked;

  return respond(async () => {
    const data = await callApi('nutrition', { query: { food } });
    toCache(key, data);
    return data;
  });
}
