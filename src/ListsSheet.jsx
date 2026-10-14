import { useEffect, useState } from 'react';

function ago(ts) {
  if (!ts) return 'never';
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export default function ListsSheet({ lists, syncing, prefill, autoAdd, onSync, onRemove, onClose }) {
  const [url, setUrl] = useState(prefill || '');
  const [error, setError] = useState(null);
  const adding = url && syncing[url.trim()];

  async function add(e) {
    e?.preventDefault();
    const u = url.trim();
    if (!u) return;
    setError(null);
    const err = await onSync(u);
    if (err) setError(err);
    else setUrl('');
  }

  useEffect(() => {
    if (autoAdd && prefill) add();
  }, []);

  const syncAll = () => lists.forEach((l) => onSync(l.url));

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && lists.length && onClose()}>
      <section className="sheet">
        <header>
          <h3>Your lists</h3>
          {lists.length > 0 && (
            <button className="link" onClick={onClose}>
              Done
            </button>
          )}
        </header>

        <form onSubmit={add} className="add">
          <input
            type="url"
            inputMode="url"
            placeholder="Paste a shared Google Maps list link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" disabled={!url.trim() || adding}>
            {adding ? '…' : 'Add'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}

        {lists.length > 0 && (
          <ul className="lists">
            {lists.map((l) => (
              <li key={l.url}>
                <div>
                  <strong>{l.title}</strong>
                  <small>
                    {l.places.length} places · synced {ago(l.syncedAt)}
                  </small>
                </div>
                <button onClick={() => onSync(l.url)} disabled={syncing[l.url]} aria-label="Sync">
                  {syncing[l.url] ? '…' : '⟳'}
                </button>
                <button onClick={() => confirm(`Remove “${l.title}”?`) && onRemove(l.url)} aria-label="Remove">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {lists.length > 1 && (
          <button className="wide" onClick={syncAll}>
            Sync all
          </button>
        )}

        <details className="help" open={lists.length === 0}>
          <summary>How do I get the link?</summary>
          <ol>
            <li>Google Maps → <b>You</b> → <b>Saved</b> → open a list</li>
            <li>Tap <b>⋮</b> / <b>Share</b> and turn on <b>link sharing</b></li>
            <li>Copy the link and paste it above — or share it straight to <b>wheretoeat</b></li>
          </ol>
          <p>Changes you make to the list in Google Maps show up here when you sync.</p>
        </details>
      </section>
    </div>
  );
}
