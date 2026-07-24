"use client";
import React from "react";
import dynamic from "next/dynamic";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";

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

// Sample projects with real-ish lat/lng offsets — replaced by Supabase later
const SAMPLE_PROJECTS = [
  { id: 1, t: 'Prospect Park cleanup', cat: 'Cleanup', when: 'Sat, Jul 26 · 9am', host: 'Local Green Crew', going: 84, latOff: 0.008, lngOff: -0.004 },
  { id: 2, t: 'Neighborhood repair café', cat: 'Repair', when: 'Sun, Jul 27 · 11am', host: 'Fix-it Collective', going: 32, latOff: -0.005, lngOff: 0.009 },
  { id: 3, t: 'Solar panel barn-raising', cat: 'Energy', when: 'Sat, Aug 2 · 8am', host: 'Sunhill Coop', going: 12, latOff: 0.012, lngOff: 0.006 },
  { id: 4, t: 'Community garden plot signups', cat: 'Garden', when: 'Open enrollment', host: 'Local Garden Club', going: 64, latOff: -0.010, lngOff: -0.007 },
  { id: 5, t: 'Compost drop-off (Saturdays)', cat: 'Waste', when: 'Every Sat · 10am–2pm', host: 'City Composts', going: 240, latOff: 0.003, lngOff: 0.014 },
  { id: 6, t: 'Climate policy phonebank', cat: 'Policy', when: 'Wed, Jul 30 · 6pm', host: 'Climate Action Net.', going: 48, latOff: -0.007, lngOff: -0.012 },
];


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

  // Build projects at real coordinates relative to user
  const projects = React.useMemo(() => {
    if (userLat === null || userLng === null) return [];
    return SAMPLE_PROJECTS.map(p => ({
      ...p,
      lat: userLat + p.latOff,
      lng: userLng + p.lngOff,
      color: CAT_COLORS[p.cat] || '#22c55e',
    }));
  }, [userLat, userLng]);

  const filtered = projects.filter(p => {
    const catMatch = filter === 'all' || p.cat.toLowerCase() === filter;
    const searchMatch = !search || p.t.toLowerCase().includes(search.toLowerCase()) || p.host.toLowerCase().includes(search.toLowerCase());
    return catMatch && searchMatch;
  });

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
              {filtered.length} projects near you
            </h1>
            <p style={{ margin: '4px 0 12px', color: 'var(--ink-3)', fontSize: 13 }}>Find something to do this weekend — or start your own.</p>

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
            {geoLoading ? (
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
                    <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{p.cat.toUpperCase()} · {p.when}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{p.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>by {p.host}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex' }}>
                        {[0, 1, 2].map(i => (
                          <span key={i} style={{
                            width: 22, height: 22, borderRadius: '50%', marginLeft: i ? -8 : 0,
                            background: ['var(--green)', 'var(--sky)', 'var(--sun)'][i],
                            border: '2px solid var(--surface)',
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{p.going} going</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map column */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {mapReady && userLat !== null && userLng !== null ? (
            <MapContainer
              key={mapKey}
              ref={mapRef}
              center={[userLat, userLng]}
              zoom={14}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution={'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              />
              {/* User location marker */}
              <Marker position={[userLat, userLng]} icon={makeUserIcon()}>
                <Popup>
                  <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                    📍 You are here
                  </div>
                </Popup>
              </Marker>
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
                        <span style={{ fontSize: 12, color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>{p.going} going</span>
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
              <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
                <div style={{ marginBottom: 8, fontSize: 28 }}>📍</div>
                {geoLoading ? 'Getting your location…' : 'Map loading…'}
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

          {/* Floating area summary */}
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
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>THIS MONTH IN {locationName.toUpperCase()}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>2,840 hours · 380 kg waste removed · 92 trees planted</div>
            </div>
          </div>
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
  const credits = [
    { name: 'Mau Forest restoration', region: 'Kenya', type: 'Forestry', verifier: 'Verra VCS', vintage: '2025', price: '$18.20', volume: '12,400 tCO₂', tag: 'Premium', color: 'var(--green)' },
    { name: 'Borneo peatland protection', region: 'Indonesia', type: 'Wetland', verifier: 'Gold Standard', vintage: '2024', price: '$24.80', volume: '8,200 tCO₂', tag: 'Verified', color: 'var(--green-2)' },
    { name: 'Patagonia rewilding', region: 'Chile', type: 'Rewilding', verifier: 'Plan Vivo', vintage: '2025', price: '$31.50', volume: '4,100 tCO₂', tag: 'Premium', color: 'var(--green)' },
    { name: 'Direct air capture (Hellisheiði)', region: 'Iceland', type: 'DAC', verifier: 'Puro.Earth', vintage: '2026', price: '$420', volume: '120 tCO₂', tag: 'Removal', color: 'var(--sky)' },
    { name: 'Mangrove blue carbon', region: 'Senegal', type: 'Coastal', verifier: 'Verra VCS', vintage: '2024', price: '$22.00', volume: '6,800 tCO₂', tag: 'Verified', color: 'var(--green-2)' },
    { name: 'Biochar (Sonoma Coop)', region: 'USA', type: 'Soil', verifier: 'Puro.Earth', vintage: '2025', price: '$118', volume: '900 tCO₂', tag: 'Removal', color: 'var(--sky)' },
  ];
  const matches = (c) => filter === 'All credits' ? true : filter === 'Removal' ? c.tag === 'Removal' : c.type === filter;
  const shown = credits.filter(matches);
  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="carbon" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>CARBON MARKET · LIVE</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em' }}>Offset what you can't avoid.</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: 14 }}>Every credit on Honua is on-chain verified, third-party audited, and traceable to a project you can actually visit.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => app.openModal?.('wallet')}>Wallet · 24 IT</button>
            <button className="btn btn-primary" onClick={() => app.openModal?.('offsetyear')}>Offset my year</button>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, margin: '20px 0 18px' }}>
          {[
            ['SPOT PRICE · tCO₂', '$24.10', '+1.8%'],
            ['VOLUME · 24h', '2,840 t', '+12%'],
            ['PROJECTS LISTED', '147', '+4 this week'],
            ['YOUR OFFSETS · 2026', '1.4 t', '24 IT spent'],
          ].map(([l, v, d]) => (
            <div key={l} style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', letterSpacing: '.06em' }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'Lora', marginTop: 4, letterSpacing: '-0.02em' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontFamily: 'JetBrains Mono' }}>↗ {d}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="pill-nav">
            {['All credits', 'Forestry', 'Removal', 'Wetland', 'Soil', 'Coastal'].map((t) => (
              <button key={t} className={filter === t ? 'active' : ''} onClick={() => setFilter(t)}>{t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="chip">Sort: Price ↑</span>
            <span className="chip">Vintage 2024+</span>
            <span className="chip">+ filter</span>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
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
            <div key={i} className="row-hover" onClick={() => app.openModal?.('credit', c)} style={{
              display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1fr 1fr 1fr 1fr 110px',
              padding: '14px 18px', borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--line)',
              gap: 12, alignItems: 'center', fontSize: 13, cursor: 'pointer',
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
                  <span className="verified-impact" style={{ marginTop: 4 }}>on-chain · {c.tag}</span>
                </div>
              </div>
              <span>{c.type}</span>
              <span>{c.region}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{c.verifier}</span>
              <span style={{ fontFamily: 'JetBrains Mono' }}>{c.vintage}</span>
              <span style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{c.price}</span>
              <span style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>{c.volume}</span>
              <button className="btn btn-green" onClick={(e) => { e.stopPropagation(); app.openModal?.('credit', c); }} style={{ padding: '6px 12px', fontSize: 12, justifyContent: 'center' }}>Buy</button>
            </div>
          ))}
          {shown.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No credits match this filter.</div>}
        </div>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <div style={{
            background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)',
            padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
          }}>
            <div>
              <span className="chip chip-sky">Auto-offset</span>
              <h2 className="font-display" style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Subscribe & forget</h2>
              <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.5 }}>We auto-purchase credits monthly to match your tracked footprint. Pause anytime. Receipts emailed quarterly.</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn btn-primary" onClick={() => app.openModal?.('autooffset')}>Start auto-offset · $14/mo</button>
              </div>
            </div>
            <ImagePlaceholder label="forest canopy from above" height={160} />
          </div>
          <div style={{
            background: 'var(--ink-solid)', color: '#fff', borderRadius: 16, padding: 22,
            position: 'relative', overflow: 'hidden',
          }}>
            <span style={{
              background: 'rgba(255,255,255,.12)', color: '#fff', padding: '3px 10px', borderRadius: 999,
              fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600,
            }}>NEW</span>
            <h2 className="font-display" style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Honua impact NFT</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.5 }}>Mint a soulbound token tied to your offsets. Wears your year on-chain.</p>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button className="btn" style={{ background: '#fff', color: '#0a0d0b' }} onClick={() => app.openModal?.('celebrate', { title: 'Impact NFT minted', sub: 'Your soulbound 2026 token is on-chain. It updates as your verified offsets grow.' })}>Mint 2026</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
