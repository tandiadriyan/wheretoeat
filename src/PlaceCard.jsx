import { useEffect, useRef, useState } from 'react';
import { cachedDetails, fetchDetails, photoUrl, mapsUrl, directionsUrl, formatDistance } from './store.js';

// Fetch details only when the card is within a screen or so of the viewport.
function useNearViewport(ref) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '150% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return near;
}

export default function PlaceCard({ place, mark, onToggle }) {
  const ref = useRef(null);
  const near = useNearViewport(ref);
  const [details, setDetails] = useState(() => (place.placeId ? cachedDetails(place.placeId) : null));
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (!near || details || !place.placeId) return;
    let alive = true;
    fetchDetails(place.placeId).then((d) => alive && d && setDetails(d));
    return () => {
      alive = false;
    };
  }, [near, place.placeId]);

  const photos = details?.photos ?? [];
  const meta = [
    details?.type,
    details?.price,
    details?.rating != null && `★ ${details.rating.toFixed(1)}${details.ratingCount ? ` (${details.ratingCount.toLocaleString()})` : ''}`,
    formatDistance(place.km),
  ].filter(Boolean);

  const share = () => {
    const url = details?.mapsUri || mapsUrl(place);
    if (navigator.share) navigator.share({ title: place.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  };

  return (
    <article className="card" ref={ref}>
      <div
        className="photos"
        onScroll={(e) => setPhotoIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.length > 0 ? (
          photos.map((name, i) => (
            <img key={name} src={photoUrl(name)} alt="" loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
          ))
        ) : (
          <div className="nophoto">
            <span>{place.name.slice(0, 1)}</span>
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="dots">
          {photos.map((n, i) => (
            <i key={n} className={i === photoIdx ? 'on' : ''} />
          ))}
        </div>
      )}

      <div className="info">
        <div className="badges">
          <span className="badge list">{place.listTitle}</span>
          {details?.openNow != null && (
            <span className={`badge ${details.openNow ? 'open' : 'closed'}`}>{details.openNow ? 'Open now' : 'Closed'}</span>
          )}
        </div>
        <h2>{place.name}</h2>
        {meta.length > 0 && <p className="meta">{meta.join(' · ')}</p>}
        {place.note && <p className="note">“{place.note}”</p>}
        {!place.note && details?.summary && <p className="summary">{details.summary}</p>}
        {place.address && <p className="addr">{place.address}</p>}
      </div>

      <nav className="actions">
        <button className={mark.fav ? 'on' : ''} onClick={() => onToggle('fav')} aria-label="Favourite">
          <span>{mark.fav ? '❤️' : '🤍'}</span>
          <small>Want</small>
        </button>
        <button className={mark.been ? 'on' : ''} onClick={() => onToggle('been')} aria-label="Been there">
          <span>{mark.been ? '✅' : '☑️'}</span>
          <small>Been</small>
        </button>
        <a href={mapsUrl(place)} target="_blank" rel="noreferrer" aria-label="Open in Google Maps">
          <span>🗺️</span>
          <small>Maps</small>
        </a>
        <a href={directionsUrl(place)} target="_blank" rel="noreferrer" aria-label="Directions">
          <span>🧭</span>
          <small>Go</small>
        </a>
        <button onClick={share} aria-label="Share">
          <span>↗️</span>
          <small>Share</small>
        </button>
      </nav>
    </article>
  );
}
