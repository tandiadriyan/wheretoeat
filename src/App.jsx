import { useEffect, useMemo, useRef, useState } from 'react';
import { loadState, saveState, placeKey, fetchList, distanceKm, findUrl } from './store.js';
import PlaceCard from './PlaceCard.jsx';
import ListsSheet from './ListsSheet.jsx';

const STALE_AFTER = 6 * 60 * 60 * 1000;

function shuffled(arr, seed) {
  // Deterministic per seed so the order doesn't jump on every re-render.
  const a = [...arr];
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [listFilter, setListFilter] = useState('all');
  const [sort, setSort] = useState('shuffle');
  const [hideBeen, setHideBeen] = useState(false);
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [here, setHere] = useState(null);
  const [sheet, setSheet] = useState(() => (loadState().lists.length ? null : { prefill: '' }));
  const [syncing, setSyncing] = useState({});
  const feedRef = useRef(null);

  useEffect(() => saveState(state), [state]);

  async function syncList(url) {
    setSyncing((s) => ({ ...s, [url]: true }));
    try {
      const data = await fetchList(url);
      setState((st) => {
        const entry = { url, listId: data.listId, title: data.title, places: data.places, syncedAt: Date.now() };
        const exists = st.lists.some((l) => l.url === url || l.listId === data.listId);
        const lists = exists
          ? st.lists.map((l) => (l.url === url || l.listId === data.listId ? entry : l))
          : [...st.lists, entry];
        return { ...st, lists };
      });
      return null;
    } catch (err) {
      return err.message;
    } finally {
      setSyncing((s) => ({ ...s, [url]: false }));
    }
  }

  const removeList = (url) => setState((st) => ({ ...st, lists: st.lists.filter((l) => l.url !== url) }));

  // Quietly refresh stale lists on open, and pick up links shared from Android's share sheet.
  useEffect(() => {
    for (const l of state.lists) if (Date.now() - (l.syncedAt || 0) > STALE_AFTER) syncList(l.url);

    const params = new URLSearchParams(location.search);
    const shared = findUrl(params.get('url'), params.get('text'), params.get('title'));
    if (shared) {
      history.replaceState(null, '', '/');
      setSheet({ prefill: shared, autoAdd: true });
    }
  }, []);

  useEffect(() => {
    if (sort !== 'nearby' || here) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setSort('shuffle'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [sort, here]);

  const activeList = state.lists.some((l) => l.url === listFilter) ? listFilter : 'all';

  const feed = useMemo(() => {
    const seen = new Map();
    for (const l of state.lists) {
      if (activeList !== 'all' && l.url !== activeList) continue;
      for (const p of l.places) {
        const key = placeKey(p);
        if (seen.has(key)) continue;
        if (hideBeen && state.marks[key]?.been) continue;
        seen.set(key, { ...p, key, listTitle: l.title });
      }
    }
    let items = [...seen.values()];
    if (here) items = items.map((p) => ({ ...p, km: distanceKm(here, p) }));
    if (sort === 'shuffle') items = shuffled(items, seed);
    if (sort === 'nearby' && here) items.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
    return items;
  }, [state, activeList, hideBeen, sort, seed, here]);

  useEffect(() => feedRef.current?.scrollTo({ top: 0 }), [activeList, sort, seed, hideBeen]);

  const toggleMark = (key, field) =>
    setState((st) => {
      const cur = st.marks[key] || {};
      return { ...st, marks: { ...st.marks, [key]: { ...cur, [field]: !cur[field] } } };
    });

  const surprise = () => {
    const el = feedRef.current;
    if (!el || feed.length < 2) return;
    const current = Math.round(el.scrollTop / el.clientHeight);
    let i = current;
    while (i === current) i = Math.floor(Math.random() * feed.length);
    el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <header className="topbar">
        <select value={activeList} onChange={(e) => setListFilter(e.target.value)} aria-label="List">
          <option value="all">All lists</option>
          {state.lists.map((l) => (
            <option key={l.url} value={l.url}>
              {l.title}
            </option>
          ))}
        </select>
        <div className="seg" role="group" aria-label="Order">
          <button className={sort === 'shuffle' ? 'on' : ''} onClick={() => (sort === 'shuffle' ? setSeed(Date.now() % 100000) : setSort('shuffle'))}>
            Shuffle
          </button>
          <button className={sort === 'nearby' ? 'on' : ''} onClick={() => setSort('nearby')}>
            Nearby
          </button>
        </div>
        <button className={`chip ${hideBeen ? 'on' : ''}`} onClick={() => setHideBeen((v) => !v)} title="Hide places you've been">
          ✅
        </button>
        <button className="chip" onClick={() => setSheet({ prefill: '' })} aria-label="Manage lists">
          ☰
        </button>
      </header>

      <main className="feed" ref={feedRef}>
        {feed.map((p) => (
          <PlaceCard key={p.key} place={p} mark={state.marks[p.key] || {}} onToggle={(f) => toggleMark(p.key, f)} />
        ))}
        {feed.length === 0 && state.lists.length > 0 && (
          <div className="empty">
            <p>Nothing here{hideBeen ? ' — you’ve been everywhere on this list!' : '.'}</p>
          </div>
        )}
      </main>

      {feed.length > 1 && (
        <button className="dice" onClick={surprise} aria-label="Surprise me">
          🎲
        </button>
      )}

      {sheet && (
        <ListsSheet
          lists={state.lists}
          syncing={syncing}
          prefill={sheet.prefill}
          autoAdd={sheet.autoAdd}
          onSync={syncList}
          onRemove={removeList}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
