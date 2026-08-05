"use client";
import React from "react";
import dynamic from "next/dynamic";
import { Icon, ImagePlaceholder, DesktopSidebar, useApp } from "@/components/shared";

// Leaflet CSS (loaded once globally)
import "leaflet/dist/leaflet.css";

// react-leaflet components loaded client-side only (no SSR)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

// Leaflet icon fix for Next.js (icon images get bundled weirdly without this)
function fixLeafletIcons() {
  if (typeof window === "undefined") return;
  const L = require("leaflet");
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const CAT_COLORS: Record<string, string> = {
  Cleanup: '#16a34a',
  Garden:  '#15803d',
  Energy:  '#d97706',
  Repair:  '#0284c7',
  Policy:  '#4f46e5',
  Waste:   '#ea580c',
};

const CAT_EMOJI: Record<string, string> = {
  Cleanup: '🧹',
  Garden:  '🌱',
  Energy:  '⚡',
  Repair:  '🔧',
  Policy:  '📢',
  Waste:   '♻️',
};

// Great-circle distance in km. Used to order the list nearest-first — projects are
// never filtered out by distance, since a sparse map is worse than a far-away pin.
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fmtDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m away`
    : km < 10 ? `${km.toFixed(1)} km away`
    : `${Math.round(km).toLocaleString()} km away`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;


function makeCatIcon(cat: string) {
  if (typeof window === "undefined") return null;
  const color = CAT_COLORS[cat] || '#16a34a';
  const emoji = CAT_EMOJI[cat] || '📍';
  const L = require("leaflet");
  // Teardrop pin: circle on top, sharp point at bottom
  // Total height: 44px circle + 10px tail = 54px. iconAnchor at bottom tip.
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 8px rgba(0,0,0,.28));">
        <div style="
          width:44px;height:44px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${color};
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:20px;line-height:1;">${emoji}</span>
        </div>
      </div>`,
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    popupAnchor: [0, -54],
  });
}

function makeUserIcon() {
  if (typeof window === "undefined") return null;
  const L = require("leaflet");
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:rgba(59,130,246,.2);
          animation:userPulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;inset:3px;border-radius:50%;
          background:#3b82f6;border:2.5px solid #fff;
          box-shadow:0 2px 8px rgba(59,130,246,.5);
        "></div>
      </div>
      <style>
        @keyframes userPulse {
          0%{transform:scale(1);opacity:.6}
          100%{transform:scale(2.8);opacity:0}
        }
      </style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });
}

// =============== Desktop Local Action Map ===============
export function DesktopMap({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [userLat, setUserLat] = React.useState<number | null>(null);
  const [userLng, setUserLng] = React.useState<number | null>(null);
  const [locationName, setLocationName] = React.useState('');
  const [geoError, setGeoError] = React.useState('');
  const [geoLoading, setGeoLoading] = React.useState(true);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapKey, setMapKey] = React.useState(0);
  const mapRef = React.useRef<any>(null);

  // Custom location search state
  const [locInput, setLocInput] = React.useState('');
  const [locSearching, setLocSearching] = React.useState(false);
  const [locResults, setLocResults] = React.useState<any[]>([]);
  const [showLocSearch, setShowLocSearch] = React.useState(false);
  const locRef = React.useRef<HTMLDivElement>(null);

  // Fix Leaflet icons on mount
  React.useEffect(() => { fixLeafletIcons(); setMapReady(true); }, []);

  // Real projects from Supabase (created via "Start a project").
  // null = still loading, [] = loaded and genuinely empty — the two need different UI.
  const [dbProjects, setDbProjects] = React.useState<any[] | null>(null);
  const loadDbProjects = React.useCallback(() => {
    import('@/lib/market')
      .then(({ getMapProjects }) => getMapProjects())
      .then(setDbProjects)
      .catch(() => setDbProjects([]));
  }, []);
  React.useEffect(() => { loadDbProjects(); }, [loadDbProjects]);

  // Refresh the list when a project is created from the modal
  React.useEffect(() => {
    const handler = () => loadDbProjects();
    window.addEventListener('honua:project-created', handler);
    return () => window.removeEventListener('honua:project-created', handler);
  }, [loadDbProjects]);

  // Close location dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setShowLocSearch(false); setLocResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address;
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const cc = (addr.country_code || '').toUpperCase();
      setLocationName(city && cc ? `${city}, ${cc}` : city || cc || 'your area');
    } catch {
      setLocationName('your area');
    }
  }

  async function searchLocation(query: string) {
    if (!query.trim()) return;
    setLocSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setLocResults(data);
    } catch {}
    setLocSearching(false);
  }

  function applyLocation(lat: number, lng: number, displayName: string) {
    setUserLat(lat); setUserLng(lng);
    setLocationName(displayName);
    setShowLocSearch(false); setLocResults([]); setLocInput('');
    setMapKey(k => k + 1);
  }

  async function ipFallback() {
    try {
      const res = await fetch('https://ip-api.com/json/?fields=lat,lon,city,countryCode');
      const data = await res.json();
      if (data.lat && data.lon) {
        setUserLat(data.lat); setUserLng(data.lon);
        const cc = (data.countryCode || '').toUpperCase();
        setLocationName(data.city && cc ? `${data.city}, ${cc}` : data.city || 'your area');
        setMapKey(k => k + 1);
      }
    } catch {}
    setGeoLoading(false);
  }

  // Get real location on mount
  React.useEffect(() => {
    if (!navigator.geolocation) {
      setGeoLoading(false);
      ipFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude); setUserLng(longitude);
        setMapKey(k => k + 1);
        setGeoLoading(false);
        await reverseGeocode(latitude, longitude);
      },
      async () => {
        // GPS denied/failed — fall back to IP geolocation
        await ipFallback();
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const projectsLoading = dbProjects === null;
  const located = userLat !== null && userLng !== null;

  // Real projects carry absolute coords, so they render with or without a fix on
  // the user — knowing where you are only changes the order, not the contents.
  const projects = React.useMemo(() => {
    const list = (dbProjects ?? []).map(p => ({ ...p, color: CAT_COLORS[p.cat] || '#22c55e' }));
    if (userLat === null || userLng === null) return list;
    return list
      .map(p => ({ ...p, distKm: distanceKm(userLat, userLng, p.lat, p.lng) }))
      .sort((a, b) => a.distKm - b.distKm);
  }, [dbProjects, userLat, userLng]);

  const filtered = projects.filter(p => {
    const catMatch = filter === 'all' || (p.cat ?? '').toLowerCase() === filter;
    const q = search.trim().toLowerCase();
    const searchMatch = !q || (p.t ?? '').toLowerCase().includes(q) || (p.host ?? '').toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  // Centre on the user when we have them, otherwise on the closest thing to a
  // subject the page has — the first project. Without either there is nothing to show.
  const center = React.useMemo<[number, number] | null>(() => {
    if (userLat !== null && userLng !== null) return [userLat, userLng];
    const first = projects.find(p => typeof p.lat === 'number' && typeof p.lng === 'number');
    return first ? [first.lat, first.lng] : null;
  }, [userLat, userLng, projects]);

  const totalGoing = projects.reduce((s, p) => s + (p.going ?? 0), 0);

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="map" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* List column */}
        <div style={{
          width: 380, flexShrink: 0, borderRight: '1px solid var(--line)',
          background: 'var(--surface)', height: '100%', overflow: 'auto',
        }} className="no-scrollbar">
          <div style={{ padding: '24px 24px 12px' }}>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em', marginBottom: 4 }}>
              ACTION MAP
            </div>

            {/* Location pill + custom search */}
            <div ref={locRef} style={{ position: 'relative', marginBottom: 6 }}>
              <button
                onClick={() => { setShowLocSearch(v => !v); setLocResults([]); setLocInput(''); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 999, padding: '5px 12px 5px 10px',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  color: geoLoading ? 'var(--ink-3)' : 'var(--ink)',
                }}
              >
                <Icon name="pin" size={13} />
                {geoLoading ? 'Locating…' : (locationName || 'your area')}
                <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 2 }}>✎</span>
              </button>

              {showLocSearch && (
                <div style={{
                  position: 'absolute', top: '110%', left: 0, zIndex: 200,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 14, boxShadow: '0 8px 32px -8px rgba(0,0,0,.18)',
                  width: 300, overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                    <Icon name="search" size={14} color="var(--ink-3)" />
                    <input
                      autoFocus
                      value={locInput}
                      onChange={e => setLocInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchLocation(locInput)}
                      placeholder="Search city, neighbourhood…"
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
                    />
                    {locSearching
                      ? <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>…</span>
                      : <button onClick={() => searchLocation(locInput)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>Go</button>
                    }
                  </div>
                  {locResults.length > 0 && (
                    <div>
                      {locResults.map((r, i) => {
                        const parts = r.display_name.split(', ');
                        const label = parts.slice(0, 2).join(', ');
                        const sub = parts.slice(2, 4).join(', ');
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              const addr = r.address || {};
                              const city = addr.city || addr.town || addr.village || parts[0] || '';
                              const cc = (addr.country_code || '').toUpperCase();
                              applyLocation(parseFloat(r.lat), parseFloat(r.lon), city && cc ? `${city}, ${cc}` : label);
                            }}
                            style={{
                              width: '100%', textAlign: 'left', background: 'none',
                              border: 'none', borderBottom: i < locResults.length - 1 ? '1px solid var(--line)' : 'none',
                              padding: '10px 14px', cursor: 'pointer', display: 'block',
                            }}
                            className="row-hover"
                          >
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                            {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!locSearching && locInput && locResults.length === 0 && (
                    <div style={{ padding: '14px', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
                      Press Enter or Go to search
                    </div>
                  )}
                  <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-3)' }}>
                    Powered by OpenStreetMap Nominatim
                  </div>
                </div>
              )}
            </div>

            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {projectsLoading ? 'Loading projects…'
                : projects.length === 0 ? 'Nothing on the map yet'
                : plural(filtered.length, 'project')}
            </h1>
            <p style={{ margin: '4px 0 12px', color: 'var(--ink-3)', fontSize: 13 }}>
              {projects.length === 0
                ? 'Be the first to put something here — a cleanup, a garden, a repair café.'
                : located
                  ? 'Nearest first. Find something to do this weekend — or start your own.'
                  : 'Find something to do this weekend — or start your own.'}
            </p>

            <div style={{
              background: 'var(--bg-2)', borderRadius: 999, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects, hosts, tags"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All', 'Cleanup', 'Garden', 'Energy', 'Repair', 'Policy', 'Waste'].map(t => (
                <button key={t} onClick={() => setFilter(t.toLowerCase())} className={'chip ' + (filter === t.toLowerCase() ? 'chip-green' : '')} style={{ cursor: 'pointer', border: 'none' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)' }}>
            {projectsLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ padding: '14px 24px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--line)', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 10, borderRadius: 4, background: 'var(--line)', width: '40%' }} />
                    <div style={{ height: 14, borderRadius: 4, background: 'var(--line)', width: '75%' }} />
                    <div style={{ height: 10, borderRadius: 4, background: 'var(--line)', width: '30%' }} />
                  </div>
                </div>
              ))
            ) : projects.length === 0 ? (
              <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📍</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No projects on the map yet</div>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
                  Beach cleanups, community gardens, repair cafés, energy co-ops — start one and people near you will see it here.
                </p>
                <button className="btn btn-primary" onClick={() => app.openModal?.('startproject')}>
                  <Icon name="plus" size={14} stroke={2.2} /> Start a project
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                No projects match this filter.
              </div>
            ) : (
              filtered.map(p => (
                <div key={p.id} className="row-hover" onClick={() => app.openModal?.('project', p)} style={{
                  padding: '14px 24px', borderBottom: '1px solid var(--line)',
                  display: 'flex', gap: 12, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: p.color, color: '#fff',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}>
                    <Icon name="pin" size={20} stroke={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{(p.cat ?? '').toUpperCase()} · {p.when}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{p.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                      by {p.host}{p.distKm !== undefined ? ` · ${fmtDistance(p.distKm)}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      {p.going > 0 ? (
                        <>
                          {/* One dot per attendee, up to three — never more faces than people */}
                          <div style={{ display: 'flex' }}>
                            {Array.from({ length: Math.min(p.going, 3) }).map((_, i) => (
                              <span key={i} style={{
                                width: 22, height: 22, borderRadius: '50%', marginLeft: i ? -8 : 0,
                                background: ['var(--green)', 'var(--sky)', 'var(--sun)'][i],
                                border: '2px solid var(--surface)',
                              }} />
                            ))}
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{p.going} going</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>Be the first to join</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map column */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {mapReady && center ? (
            <MapContainer
              key={mapKey}
              ref={mapRef}
              center={center}
              zoom={located ? 14 : 11}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution={'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              />
              {/* User location marker */}
              {userLat !== null && userLng !== null && (
                <Marker position={[userLat, userLng]} icon={makeUserIcon()}>
                  <Popup>
                    <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                      📍 You are here
                    </div>
                  </Popup>
                </Marker>
              )}
              {/* Project markers */}
              {filtered.map(p => (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={makeCatIcon(p.cat)}
                  eventHandlers={{ click: () => app.openModal?.('project', p) }}
                >
                  <Popup>
                    <div style={{ padding: '14px 16px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          background: CAT_COLORS[p.cat] || '#16a34a',
                          color: '#fff', borderRadius: 6, padding: '2px 8px',
                          fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
                          textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
                        }}>{p.cat}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111', lineHeight: 1.3, marginBottom: 4 }}>{p.t}</div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>{p.when}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>by {p.host}</div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.going > 0 ? `${p.going} going` : 'Be the first to join'}
                        </span>
                        <button
                          onClick={() => app.openModal?.('project', p)}
                          style={{
                            background: CAT_COLORS[p.cat] || '#16a34a', color: '#fff',
                            border: 'none', borderRadius: 8, padding: '5px 12px',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >View →</button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'grid', placeItems: 'center',
              background: 'var(--bg-2)',
            }}>
              <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14, maxWidth: 320, padding: 24 }}>
                <div style={{ marginBottom: 8, fontSize: 28 }}>📍</div>
                {geoLoading || projectsLoading
                  ? 'Getting your location…'
                  : 'We couldn’t place you and there are no projects to centre on yet. Set a location above to start browsing.'}
              </div>
            </div>
          )}

          {/* Floating zoom controls */}
          <div style={{
            position: 'absolute', top: 20, right: 20, zIndex: 1000,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <button style={ctlBtn} onClick={() => mapRef.current?.zoomIn()}>
              <Icon name="plus" size={16} />
            </button>
            <button style={ctlBtn} onClick={() => mapRef.current?.zoomOut()}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>−</span>
            </button>
            {userLat !== null && userLng !== null && (
              <button style={ctlBtn} title="Back to my location" onClick={() => mapRef.current?.setView([userLat, userLng], 14)}>
                <Icon name="pin" size={16} />
              </button>
            )}
          </div>

          {/* Floating create */}
          <button onClick={() => app.openModal?.('startproject')} style={{
            position: 'absolute', bottom: 24, right: 24, zIndex: 1000,
            padding: '12px 18px', borderRadius: 999, background: 'var(--ink-solid)', color: '#fff',
            border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            fontWeight: 500, boxShadow: '0 10px 30px -10px rgba(0,0,0,.3)',
          }}>
            <Icon name="plus" size={16} stroke={2.2} /> Start a project
          </button>

          {/* Floating area summary — nothing to summarise until something is on the map */}
          {projects.length > 0 && (
            <div style={{
              position: 'absolute', bottom: 24, left: 24, zIndex: 1000,
              background: 'var(--surface)', borderRadius: 14,
              border: '1px solid var(--line)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 10px 30px -10px rgba(0,0,0,.15)',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--green-tint)', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                <Icon name="globe" size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>
                  {located && locationName ? `NEAREST TO ${locationName.toUpperCase()}` : 'ON THE MAP'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {plural(projects.length, 'project')}
                  {totalGoing > 0 && ` · ${totalGoing} ${totalGoing === 1 ? 'person' : 'people'} taking part`}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const ctlBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, background: 'var(--surface)',
  border: '1px solid var(--line)', cursor: 'pointer', display: 'grid', placeItems: 'center',
  color: 'var(--ink-2)', boxShadow: '0 4px 12px -4px rgba(0,0,0,.1)',
};

// Keep BigMap export for any other callers
export function BigMap({ projects = [], onPick }: { projects?: any[]; onPick?: (p: any) => void }) {
  return <div style={{ width: '100%', height: '100%', background: 'var(--bg-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 14 }}>Map</div>;
}

// =============== Desktop Carbon Marketplace (NEW) ===============
export function DesktopCarbon({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [filter, setFilter] = React.useState('All credits');
  // null = still loading, [] = no credits listed. Never a stand-in list: a credit
  // here is buyable, and buying one writes a retirement record against its name.
  const [credits, setCredits] = React.useState<any[] | null>(null);
  const [myOffsets, setMyOffsets] = React.useState<{ tonnes: number; totalCents: number } | null>(null);

  const refresh = React.useCallback(() => {
    import('@/lib/market').then(async ({ getCarbonCredits, getMyOffsets }) => {
      setCredits(await getCarbonCredits());
      if (app.user?.id) setMyOffsets(await getMyOffsets(app.user.id));
    }).catch(() => setCredits([]));
  }, [app.user?.id]);
  React.useEffect(() => { refresh(); }, [refresh]);
  React.useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('honua:offset-purchased', handler);
    return () => window.removeEventListener('honua:offset-purchased', handler);
  }, [refresh]);

  const creditsLoading = credits === null;
  const listed = credits ?? [];
  const matches = (c) => filter === 'All credits' ? true : filter === 'Removal' ? c.tag === 'Removal' : c.type === filter;
  const shown = listed.filter(matches);
  const yearLabel = new Date().getFullYear();
  const offsetsDisplay = myOffsets ? `${myOffsets.tonnes % 1 === 0 ? myOffsets.tonnes : myOffsets.tonnes.toFixed(1)} t` : '0 t';
  const offsetsSub = myOffsets ? `$${(myOffsets.totalCents / 100).toFixed(0)} retired` : 'none yet';
  // Real market stats computed from the listed credits
  const parsePrice = (c: any) => c.price_cents ? c.price_cents / 100 : parseFloat(String(c.price).replace(/[^0-9.]/g, '')) || 0;
  const avgPrice = listed.length ? listed.reduce((s, c) => s + parsePrice(c), 0) / listed.length : 0;
  const totalVolume = listed.reduce((s, c) => s + (parseFloat(String(c.volume).replace(/[^0-9.]/g, '')) || 0), 0);
  const hasListings = !creditsLoading && listed.length > 0;
  // Listings with nothing left to retire are a closed market, not a live one
  const marketOpen = hasListings && totalVolume > 0;
  // An em dash beats "$0.00" — no listings means no price, not a free market
  const stat = (v: string) => creditsLoading ? '—' : listed.length === 0 ? '—' : v;
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="carbon" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div className="carbon-inner" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>
              CARBON MARKET{marketOpen ? ' · LIVE' : ''}
            </div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Offset what you can't avoid.</h1>
            {/* Was: "on-chain verified, third-party audited, and traceable to a
                project you can actually visit". Nothing is on-chain, and
                `verifier` is free text an admin typed — there is no registry
                lookup behind it. The claim now matches what the row actually
                holds: a named standard and a vintage. See docs/BLOCKCHAIN.md
                for what it would take to make the stronger claim true. */}
            <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Every credit lists its standard, vintage and project so you can check it against the registry yourself.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => app.openModal?.('wallet')}>Wallet{myOffsets && myOffsets.tonnes > 0 ? ` · ${offsetsDisplay} retired` : ''}</button>
            {/* Nothing to buy with an empty book — don't offer a checkout */}
            {marketOpen && <button className="btn btn-primary" onClick={() => app.openModal?.('offsetyear')}>Offset my year</button>}
          </div>
        </div>

        {/* Stat strip */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, margin: '20px 0 18px' }}>
          {[
            ['AVG PRICE · tCO₂', stat(`$${avgPrice.toFixed(2)}`), hasListings ? 'across listed credits' : 'no credits listed'],
            ['AVAILABLE VOLUME', stat(`${Math.round(totalVolume).toLocaleString()} t`), marketOpen ? 'ready to retire' : 'nothing to retire yet'],
            ['PROJECTS LISTED', creditsLoading ? '—' : String(listed.length), !hasListings ? 'market not open' : marketOpen ? 'live credits' : 'all sold out'],
            [`YOUR OFFSETS · ${yearLabel}`, offsetsDisplay, offsetsSub],
          ].map(([l, v, d]) => (
            <div key={l} style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.06em' }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'Lora', marginTop: 4, letterSpacing: '-0.02em' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{d}</div>
            </div>
          ))}
        </div>

        {/* Filters — only meaningful once there is something to filter */}
        {hasListings && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="pill-nav">
              {['All credits', 'Forestry', 'Removal', 'Wetland', 'Soil', 'Coastal'].map((t) => (
                <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
              {shown.length === listed.length ? `${listed.length} listed` : `${shown.length} of ${listed.length}`}
            </div>
          </div>
        )}

        {/* Table */}
        {creditsLoading ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px', borderBottom: i === 4 ? 'none' : '1px solid var(--line)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--line)', flexShrink: 0 }} />
                <div style={{ height: 12, borderRadius: 4, background: 'var(--line)', flex: 2 }} />
                <div style={{ height: 12, borderRadius: 4, background: 'var(--line)', flex: 1 }} />
                <div style={{ height: 12, borderRadius: 4, background: 'var(--line)', flex: 1 }} />
              </div>
            ))}
          </div>
        ) : listed.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16,
            padding: '56px 24px', textAlign: 'center',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--green-tint)', color: 'var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
              <Icon name="leaf" size={22} stroke={2} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>No credits listed yet</div>
            <p style={{ margin: '0 auto', maxWidth: 460, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
              The market opens once verified projects are listed. Every credit here has to be traceable to a real
              registry entry, so there's nothing to show until then — your tracked actions keep counting in the meantime.
            </p>
            <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => onNav?.('impact')}>
              See your impact <Icon name="arrow" size={14} />
            </button>
          </div>
        ) : (
        <div className="carbon-table-scroll" style={{ overflowX: 'auto' }}>
        <div className="carbon-credits-table" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', minWidth: 720 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1fr 1fr 1fr 1fr 110px',
            padding: '12px 18px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)',
            fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em',
            gap: 12, alignItems: 'center',
          }}>
            <span>PROJECT</span>
            <span>TYPE</span>
            <span>REGION</span>
            <span>VERIFIER</span>
            <span>VINTAGE</span>
            <span style={{ textAlign: 'right' }}>PRICE</span>
            <span style={{ textAlign: 'right' }}>AVAILABLE</span>
            <span></span>
          </div>
          {shown.map((c, i) => (
            <div key={c.id ?? i} className="row-hover" onClick={() => c.volume_t > 0 && app.openModal?.('credit', c)} style={{
              display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1fr 1fr 1fr 1fr 110px',
              padding: '14px 18px', borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--line)',
              gap: 12, alignItems: 'center', fontSize: 13,
              cursor: c.volume_t > 0 ? 'pointer' : 'default',
              opacity: c.volume_t > 0 ? 1 : .6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: c.color + '18', color: c.color,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name="leaf" size={16} stroke={2} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  {/* The tag alone. "on-chain ·" prefixed a claim nothing backs. */}
                  <span className="verified-impact" style={{ marginTop: 4 }}>{c.tag}</span>
                </div>
              </div>
              <span>{c.type || '—'}</span>
              <span>{c.region || '—'}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{c.verifier || '—'}</span>
              <span style={{ fontFamily: 'JetBrains Mono' }}>{c.vintage || '—'}</span>
              <span style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{c.price}</span>
              <span style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>
                {c.volume_t > 0 ? c.volume : 'none left'}
              </span>
              {/* Nothing to retire means nothing to sell, whatever the price says */}
              {c.volume_t > 0 ? (
                <button className="btn btn-green" onClick={(e) => { e.stopPropagation(); app.openModal?.('credit', c); }} style={{ padding: '6px 12px', fontSize: 12, justifyContent: 'center' }}>Buy</button>
              ) : (
                <button className="btn btn-ghost" disabled style={{ padding: '6px 12px', fontSize: 12, justifyContent: 'center', opacity: .55, cursor: 'not-allowed' }}>Sold out</button>
              )}
            </div>
          ))}
          {shown.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No credits match this filter.</div>}
        </div>
        </div>
        )}

        {/* Both cards sell against the order book — hide them while it's empty */}
        {marketOpen && (
        <div className="two-col-grid" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)',
            padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
          }}>
            <div>
              {/* No subscription record is written anywhere and nothing
                  recurs — the old "Start auto-offset · $14/mo" button took a
                  commitment the platform cannot keep. Billing has to exist
                  before this can be sold. */}
              <span className="chip chip-sky">Auto-offset · planned</span>
              <h2 className="font-display" style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Subscribe & forget</h2>
              <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.5 }}>Monthly retirements matched to your tracked footprint, without thinking about it. Not available yet — retire manually below in the meantime.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn btn-ghost" onClick={() => app.openModal?.('autooffset')}>What's planned</button>
              </div>
            </div>
            <ImagePlaceholder label="forest canopy from above" height={160} />
          </div>
          <div style={{
            background: 'var(--ink-solid)', color: '#fff', borderRadius: 16, padding: 22,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Was labelled NEW with a "Mint 2026" button that opened a
                celebration modal saying the token was on-chain. There is no
                wallet, no contract and no token — and minting against
                retirements that carry no registry serial would put a permanent
                claim around unverified data. Kept as a stated intention, which
                is what it actually is. docs/BLOCKCHAIN.md §A.1/A.2. */}
            <span style={{
              background: 'rgba(255,255,255,.12)', color: '#fff', padding: '3px 10px', borderRadius: 999,
              fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600,
            }}>PLANNED</span>
            <h2 className="font-display" style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Honua impact record</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.5 }}>A portable, non-transferable record of your retirements — verifiable outside Honua. Not built yet; your retirements are being recorded with serials in the meantime.</p>
          </div>
        </div>
        )}
        </div>
      </main>
    </div>
  );
};
