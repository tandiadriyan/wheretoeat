// GET /api/photo?name=places/<id>/photos/<ref>&w=900  -> 302 to the image
import { json, apiKey } from './_lib/http.js';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const name = params.get('name');
  const w = Math.min(Math.max(Number(params.get('w')) || 900, 100), 1600);
  if (!name || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return json({ error: 'Bad ?name=' }, 400);
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&skipHttpRedirect=true`,
      { headers: { 'X-Goog-Api-Key': apiKey() } },
    );
    const body = await res.json();
    if (!res.ok || !body.photoUri) return json({ error: body.error?.message || 'No photo' }, 502);
    return new Response(null, {
      status: 302,
      headers: { Location: body.photoUri, 'Cache-Control': 'public, s-maxage=3600' },
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
