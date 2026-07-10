"use client";
import React from "react";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";


// =============== Desktop Local Action Map (NEW) ===============
export function DesktopMap({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const [filter, setFilter] = React.useState('all');
  const projects = [
    { id: 1, t: 'Prospect Park cleanup', cat: 'Cleanup', when: 'Sat, May 24 · 9am', host: 'Brooklyn Green Crew', going: 84, color: 'var(--green)', x: 28, y: 42 },
    { id: 2, t: 'Williamsburg repair café', cat: 'Repair', when: 'Sun, May 25 · 11am', host: 'Fix-it Collective', going: 32, color: 'var(--sky)', x: 42, y: 28 },
    { id: 3, t: 'Solar panel barn-raising', cat: 'Energy', when: 'Sat, May 31 · 8am', host: 'Sunhill Coop', going: 12, color: 'var(--sun)', x: 55, y: 52 },
    { id: 4, t: 'Bushwick community garden plot signups', cat: 'Garden', when: 'Open enrollment', host: 'BCG', going: 64, color: 'var(--green-2)', x: 38, y: 68 },
    { id: 5, t: 'Compost drop-off (Saturdays)', cat: 'Waste', when: 'Every Sat · 10am–2pm', host: 'NYC Composts', going: 240, color: 'var(--clay)', x: 65, y: 32 },
    { id: 6, t: 'Climate policy phonebank', cat: 'Policy', when: 'Wed, May 28 · 6pm', host: 'Climate Action Net.', going: 48, color: 'var(--ink)', x: 72, y: 60 },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="map" onNav={onNav} />
      <main style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* List column */}
        <div style={{
          width: 380, flexShrink: 0, borderRight: '1px solid var(--line)',
          background: 'var(--surface)', height: '100%', overflow: 'auto',
        }} className="no-scrollbar">
          <div style={{ padding: '24px 24px 12px' }}>
            <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>ACTION MAP · BROOKLYN, NY</div>
            <h1 className="font-display" style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>147 verified projects near you</h1>
            <p style={{ margin: '4px 0 12px', color: 'var(--ink-3)', fontSize: 13 }}>Find something to do this weekend — or start your own.</p>
            <div style={{
              background: 'var(--bg-2)', borderRadius: 999, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <Icon name="search" size={14} color="var(--ink-3)" />
              <input placeholder="Search projects, hosts, tags" style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13,
              }} />
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
            {projects.filter(p => filter === 'all' || p.cat.toLowerCase() === filter).map(p => (
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
                  <div style={{ fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)' }}>{p.cat.toUpperCase()} · {p.when}</div>
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
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'Geist Mono' }}>{p.going} going</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map column */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <BigMap projects={projects.filter(p => filter === 'all' || p.cat.toLowerCase() === filter)} onPick={(p) => app.openModal?.('project', p)} />
          {/* Floating controls */}
          <div style={{
            position: 'absolute', top: 20, right: 20,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <button style={ctlBtn}><Icon name="plus" size={16} /></button>
            <button style={ctlBtn}>−</button>
            <button style={ctlBtn}><Icon name="pin" size={16} /></button>
          </div>
          {/* Floating create */}
          <button onClick={() => app.openModal?.('startproject')} style={{
            position: 'absolute', bottom: 24, right: 24,
            padding: '12px 18px', borderRadius: 999, background: 'var(--ink-solid)', color: '#fff',
            border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            fontWeight: 500, boxShadow: '0 10px 30px -10px rgba(0,0,0,.3)',
          }}>
            <Icon name="plus" size={16} stroke={2.2} /> Start a project
          </button>
          {/* Floating impact summary */}
          <div style={{
            position: 'absolute', bottom: 24, left: 24,
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--line)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 16,
            boxShadow: '0 10px 30px -10px rgba(0,0,0,.15)',
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--green-tint)', color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
              <Icon name="globe" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)' }}>THIS MONTH IN YOUR AREA</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>2,840 hours · 380 kg waste removed · 92 trees planted</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ctlBtn = {
  width: 36, height: 36, borderRadius: 10, background: 'var(--surface)',
  border: '1px solid var(--line)', cursor: 'pointer', display: 'grid', placeItems: 'center',
  color: 'var(--ink-2)',
  boxShadow: '0 4px 12px -4px rgba(0,0,0,.1)',
};

export function BigMap({ projects = [], onPick }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #e6f0fa 0%, #ecf5ee 50%, #f4f3ee 100%)',
      position: 'relative',
    }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {/* Grid */}
        <defs>
          <pattern id="bigGrid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0H0v5" fill="none" stroke="rgba(0,0,0,.04)" strokeWidth="0.1"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#bigGrid)"/>
        {/* Land masses */}
        <path d="M5 50 Q20 30 40 35 T80 40 Q90 60 70 75 T20 65 Z" fill="#ecf5ee" stroke="#c8e6cf" strokeWidth="0.2"/>
        <path d="M55 10 Q70 8 85 18 T95 50 Q85 55 75 45 T55 10 Z" fill="#ecf5ee" stroke="#c8e6cf" strokeWidth="0.2"/>
        {/* Roads */}
        <path d="M0 55 Q30 45 60 58 T100 50" fill="none" stroke="#fff" strokeWidth="0.6" opacity=".8"/>
        <path d="M20 0 Q22 30 35 55 T50 100" fill="none" stroke="#fff" strokeWidth="0.4" opacity=".6"/>
        <path d="M0 80 L100 75" fill="none" stroke="#fff" strokeWidth="0.4" opacity=".6"/>
        <path d="M75 0 L80 100" fill="none" stroke="#fff" strokeWidth="0.4" opacity=".6"/>
        {/* River */}
        <path d="M0 30 Q40 38 70 30 T100 25" fill="none" stroke="#cfe5f5" strokeWidth="1.5" opacity=".9"/>
      </svg>
      {/* Markers as DOM so they stay crisp */}
      {projects.map(p => (
        <div key={p.id} onClick={() => onPick?.(p)} style={{
          position: 'absolute', left: p.x + '%', top: p.y + '%', transform: 'translate(-50%, -100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
        }}>
          <div style={{
            background: p.color, color: '#fff', padding: '6px 10px',
            borderRadius: 14, fontSize: 11, fontWeight: 600, fontFamily: 'Geist Mono',
            boxShadow: '0 4px 12px -4px rgba(0,0,0,.2)',
            whiteSpace: 'nowrap',
          }}>{p.cat}</div>
          <div style={{
            width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '8px solid ' + p.color,
          }} />
        </div>
      ))}
      {/* "You are here" pulse */}
      <div style={{ position: 'absolute', left: '48%', top: '50%' }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: 'var(--sky)',
          border: '3px solid #fff', boxShadow: '0 0 0 4px rgba(29,109,196,.2)',
        }} />
      </div>
    </div>
  );
};

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
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="carbon" onNav={onNav} />
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto', height: '100%' }} className="no-scrollbar">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em' }}>CARBON MARKET · LIVE</div>
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
              <div style={{ fontSize: 10, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.06em' }}>{l}</div>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'Bricolage Grotesque', marginTop: 4, letterSpacing: '-0.02em' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, fontFamily: 'Geist Mono' }}>↗ {d}</div>
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
            fontSize: 11, fontFamily: 'Geist Mono', color: 'var(--ink-3)', letterSpacing: '.05em',
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
              <span style={{ fontFamily: 'Geist Mono', fontSize: 12 }}>{c.verifier}</span>
              <span style={{ fontFamily: 'Geist Mono' }}>{c.vintage}</span>
              <span style={{ textAlign: 'right', fontFamily: 'Geist Mono', fontWeight: 600 }}>{c.price}</span>
              <span style={{ textAlign: 'right', fontFamily: 'Geist Mono', color: 'var(--ink-3)' }}>{c.volume}</span>
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
              fontSize: 11, fontFamily: 'Geist Mono', fontWeight: 600,
            }}>NEW</span>
            <h2 className="font-display" style={{ margin: '10px 0 6px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Honua impact NFT</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.7)', fontSize: 13, lineHeight: 1.5 }}>Mint a soulbound token tied to your offsets. Wears your year on-chain.</p>
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button className="btn" style={{ background: '#fff', color: '#0a0d0b' }} onClick={() => app.openModal?.('celebrate', { emoji: '🪙', title: 'Impact NFT minted', sub: 'Your soulbound 2026 token is on-chain. It updates as your verified offsets grow.' })}>Mint 2026</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
