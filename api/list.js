// GET /api/list?url=<shared Google Maps list link>
import { resolveShareUrl, fetchList } from './_lib/gmaps.js';
import { json } from './_lib/http.js';

export async function GET(request) {
  const shareUrl = new URL(request.url).searchParams.get('url');
  if (!shareUrl) return json({ error: 'Missing ?url=' }, 400);
  try {
    const ref = await resolveShareUrl(shareUrl.trim());
    const list = await fetchList(ref);
    return json({ ...list, listId: ref.id });
  } catch (err) {
    return json({ error: err.message }, 502);
  }
}
