// Everything lives in localStorage: the synced lists and your ❤️ / ✅ marks.

const KEY = 'wheretoeat:v1';
const DETAILS_KEY = 'wheretoeat:details:v1';
const DETAILS_TTL = 24 * 60 * 60 * 1000;

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const loadState = () => read(KEY, { lists: [], marks: {} });
export const saveState = (state) => write(KEY, state);

export const placeKey = (p) => p.placeId || `${p.name}@${p.lat},${p.lng}`;

export async function fetchList(url) {
  const res = await fetch(`/api/list?url=${encodeURIComponent(url)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Sync failed (${res.status})`);
  return body;
}

const detailsCache = read(DETAILS_KEY, {});
const inflight = new Map();

export function cachedDetails(placeId) {
  const hit = detailsCache[placeId];
  return hit && Date.now() - hit.at < DETAILS_TTL ? hit.data : null;
}

export function fetchDetails(placeId) {
  const hit = cachedDetails(placeId);
  if (hit) return Promise.resolve(hit);
  if (!inflight.has(placeId)) {
    const p = fetch(`/api/place?id=${encodeURIComponent(placeId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          detailsCache[placeId] = { at: Date.now(), data };
          for (const [k, v] of Object.entries(detailsCache)) if (Date.now() - v.at > DETAILS_TTL) delete detailsCache[k];
          write(DETAILS_KEY, detailsCache);
        }
        return data;
      })
      .catch(() => null)
      .finally(() => inflight.delete(placeId));
    inflight.set(placeId, p);
  }
  return inflight.get(placeId);
}

export const photoUrl = (name, w = 900) => `/api/photo?name=${encodeURIComponent(name)}&w=${w}`;

export function mapsUrl(p) {
  if (p.placeId) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.placeId}`;
  const q = encodeURIComponent(p.lat != null ? `${p.lat},${p.lng}` : p.name);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function directionsUrl(p) {
  const dest = encodeURIComponent(p.lat != null ? `${p.lat},${p.lng}` : p.name);
  const id = p.placeId ? `&destination_place_id=${p.placeId}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${id}`;
}

export function distanceKm(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Pull the first http(s) link out of whatever Android's share sheet handed us. */
export function findUrl(...texts) {
  for (const t of texts) {
    const m = t?.match(/https?:\/\/\S+/);
    if (m) return m[0];
  }
  return null;
}
