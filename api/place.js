// GET /api/place?id=<Google place id>  -> trimmed Places API (New) details
import { json, apiKey } from './_lib/http.js';

const FIELDS = [
  'id',
  'displayName',
  'primaryTypeDisplayName',
  'rating',
  'userRatingCount',
  'priceLevel',
  'currentOpeningHours.openNow',
  'photos',
  'editorialSummary',
  'googleMapsUri',
].join(',');

const PRICE = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[\w-]+$/.test(id)) return json({ error: 'Bad ?id=' }, 400);
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
      headers: { 'X-Goog-Api-Key': apiKey(), 'X-Goog-FieldMask': FIELDS },
    });
    const p = await res.json();
    if (!res.ok) return json({ error: p.error?.message || `Places API ${res.status}` }, 502);
    return json(
      {
        type: p.primaryTypeDisplayName?.text ?? null,
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        price: PRICE[p.priceLevel] ?? null,
        openNow: p.currentOpeningHours?.openNow ?? null,
        summary: p.editorialSummary?.text ?? null,
        mapsUri: p.googleMapsUri ?? null,
        photos: (p.photos ?? []).slice(0, 6).map((ph) => ph.name),
      },
      200,
      { 'Cache-Control': 'public, s-maxage=3600' },
    );
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
