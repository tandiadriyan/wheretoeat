// Reads a public/link-shared Google Maps list through the same undocumented
// endpoint the Maps web app uses. Not an official API: if Google changes the
// response shape, parsePlaces() is the place to fix.

import { randomBytes } from 'node:crypto';

// A bare UA makes maps.app.goo.gl answer with a real HTTP redirect instead of
// a JS page.
const UA = 'Mozilla/5.0';

// google.com, google.co.id, google.com.au, google.de, ... (and their www./maps./consent. hosts)
const ALLOWED_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|((www|maps|consent)\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2}))$/;

export function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && ALLOWED_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

/** Pull { id, token } out of a (resolved) list URL, or null. */
export function extractListRef(raw) {
  let url = raw;
  try {
    // EU visitors can get bounced through consent.google.com?continue=<real url>
    const u = new URL(raw);
    if (u.hostname.startsWith('consent.')) url = u.searchParams.get('continue') || raw;
  } catch {}
  const id = url.match(/!2s(-?[\w-]+)!/)?.[1] ?? url.match(/\/placelists\/list\/(-?[\w-]+)/)?.[1];
  if (!id) return null;
  const token = url.match(/token%3D([\w-]+)/)?.[1] ?? url.match(/[?&]token=([\w-]+)/)?.[1] ?? null;
  return { id, token };
}

/** Follow a share link (e.g. https://maps.app.goo.gl/xyz) to its list ref. */
export async function resolveShareUrl(shareUrl) {
  const direct = extractListRef(shareUrl);
  if (direct) return direct;
  if (!isAllowedUrl(shareUrl)) throw new Error('Not a Google Maps link');

  const res = await fetch(shareUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const fromUrl = extractListRef(res.url);
  if (fromUrl) return fromUrl;
  // Fallback: some variants embed the target URL in the page body.
  const body = await res.text();
  const m = body.match(/https?:\/\/[^"'\s]*placelists\/list\/[^"'\s]*/);
  const fromBody = m && extractListRef(m[0].replace(/\\u0026/g, '&'));
  if (fromBody) return fromBody;
  throw new Error('Could not find a list in that link. Is the list shared with "anyone with the link"?');
}

export async function fetchList({ id, token }) {
  const listPage = `https://www.google.com/maps/placelists/list/${id}` + (token ? `?token=${token}` : '');
  const session = randomBytes(12).toString('base64url');
  const pb =
    '!2e2!3e2!4i500!6m3' +
    `!1s${session}` +
    '!15i204459!28e2' +
    `!13s${encodeURIComponent(listPage)}` +
    '!16b1';
  const url = `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=us&pb=${pb}`;

  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google returned ${res.status}`);
  return parseList(await res.text());
}

export function parseList(text) {
  const data = JSON.parse(text.replace(/^\)\]\}'\s*/, ''));
  const root = data?.[0];
  if (!Array.isArray(root)) throw new Error('Unexpected response from Google (list format changed?)');
  return {
    title: typeof root[4] === 'string' ? root[4] : 'Untitled list',
    places: parsePlaces(root[8]),
  };
}

export function parsePlaces(entries) {
  if (!Array.isArray(entries)) return [];
  const out = [];
  for (const p of entries) {
    const info = Array.isArray(p?.[1]) ? p[1] : [];
    const name = typeof p?.[2] === 'string' ? p[2] : null;
    if (!name) continue;
    const ll = info[5];
    const cid = info[6];
    out.push({
      name,
      note: typeof p[3] === 'string' && p[3].trim() ? p[3].trim() : null,
      address: typeof info[4] === 'string' ? info[4] : null,
      lat: Array.isArray(ll) && typeof ll[2] === 'number' ? ll[2] : null,
      lng: Array.isArray(ll) && typeof ll[3] === 'number' ? ll[3] : null,
      cid: Array.isArray(cid) && cid.length >= 2 ? `${cid[0]}:${cid[1]}` : null,
      placeId: typeof info[7] === 'string' && info[7] ? info[7] : null,
    });
  }
  return out;
}
