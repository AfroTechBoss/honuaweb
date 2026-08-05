"use client";
import React from "react";
// One vocabulary for payout destinations across the application, the seller's
// payouts page and the admin queue — see lib/payout-methods.ts.
import { PAYOUT_KIND_LABEL, CONNECT_COUNTRIES, BANK_COUNTRIES, connectSupports, type PayoutKind } from "@/lib/payout-methods";
import { Icon, Logo, Avatar, ImagePlaceholder, ScorePill, VerifiedImpact, Modal, ModalHead, ToggleC, DesktopSidebar, ToastHost, Stat, NotifPrefs, useApp, PostCard, ActionBtn, TrendingPanel, MyImpactCard, SuggestedFollows, CommentThread, CommentNode, makeCommentSeed, formatCount, SBadge, SStat, SSpark, SStepper, SHead, RoleChip, sTint, sMoney, MOCK, MOCK_SELLER, MOCK_APPLICATIONS, MOCK_ADMIN, S_STATUS, ADMIN_ROLES, REPORT_REASONS, SELLER_CATEGORIES, SELLER_PRACTICES, SELLER_CERTS } from "@/components/shared";


// =====================================================================
// Small form helpers (prefixed to avoid global collisions)
// =====================================================================
const FLD_PAD_LEFT = 13;   // the .fld default
const FLD_PREFIX_GAP = 3;  // breathing room between prefix and what's typed

function FldText({ label, hint, value, onChange, placeholder, prefix, area, type = 'text' }: { label?: string; hint?: string; value?: any; onChange?: (value: any) => void; placeholder?: string; prefix?: string; area?: boolean; type?: string }) {
  // The prefix is absolutely positioned, so the input has to be padded past it
  // by hand. Measuring beats guessing: a hardcoded offset fits "$" and buries
  // the first characters of anything longer, like "honua.green/shop/".
  const prefixRef = React.useRef<HTMLSpanElement>(null);
  const [padLeft, setPadLeft] = React.useState(FLD_PAD_LEFT);

  React.useLayoutEffect(() => {
    if (!prefix) { setPadLeft(FLD_PAD_LEFT); return; }
    const el = prefixRef.current;
    if (!el) return;
    const measure = () => setPadLeft(FLD_PAD_LEFT + el.offsetWidth + FLD_PREFIX_GAP);
    measure();
    // Webfonts land after first paint and change the prefix's width with them.
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [prefix]);

  return (
    <label style={{ display: 'block' }}>
      {label && <span className="fld-label">{label}</span>}
      {area ? (
        <textarea className="fld" rows={4} value={value} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} />
      ) : (
        <div style={{ position: 'relative' }}>
          {prefix && <span ref={prefixRef} style={{ position: 'absolute', left: FLD_PAD_LEFT, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)', fontSize: 14, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{prefix}</span>}
          <input className="fld" type={type} value={value} placeholder={placeholder} onChange={e => onChange?.(e.target.value)} style={{ paddingLeft: padLeft }} />
        </div>
      )}
      {hint && <span style={{ fontSize: 11.5, color: 'var(--ink-4)', display: 'block', marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

function ChipGroup({ options, value = [], onToggle, single }: { options: string[]; value?: any[]; onToggle?: (value: any) => void; single?: boolean }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => onToggle?.(o)} style={{
            padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'Satoshi', display: 'inline-flex', alignItems: 'center', gap: 7,
            background: on ? 'var(--green-tint)' : 'var(--surface)',
            color: on ? 'var(--green)' : 'var(--ink-2)',
            border: '1px solid ' + (on ? 'transparent' : 'var(--line)'),
          }}>
            {on && <Icon name="check" size={13} stroke={2.6} />}{o}
          </button>
        );
      })}
    </div>
  );
}

function CheckRow({ checked, onToggle, title, sub, policyHref }: { checked?: boolean; onToggle?: () => void; title?: string; sub?: string; policyHref?: string }) {
  return (
    <button onClick={onToggle} className="opt-row" style={{ alignItems: 'flex-start' }}>
      <span style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
        border: '1.5px solid ' + (checked ? 'var(--green)' : 'var(--line-2)'),
        background: checked ? 'var(--green)' : 'transparent', color: '#fff',
        display: 'grid', placeItems: 'center',
      }}>{checked && <Icon name="check" size={13} stroke={3} />}</span>
      <span style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
          {policyHref ? (
            <>
              I agree to the{' '}
              <a href={policyHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--green)', textDecoration: 'underline' }}>
                Honua Seller Policy
              </a>
            </>
          ) : title}
        </span>
        {sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.45 }}>{sub}</span>}
      </span>
    </button>
  );
}

// =====================================================================
// DesktopSell — landing + application wizard + status screens
// =====================================================================
export function DesktopSell({ onNav, params }: { onNav: any; params?: Record<string, unknown> }) {
  const app = useApp();
  const status = app.state?.sellerStatus || 'none';
  const [started, setStarted] = React.useState(false);
  // Set by "Revise & re-apply". Without it the sync effect below would put the
  // rejected screen straight back, because the stored application really is
  // still rejected until a new one is filed.
  const [reapplying, setReapplying] = React.useState(false);
  // Only true once the database has actually answered. Until then the screen
  // shows nothing decisive — offering "apply to sell" to someone whose
  // application is in the queue is the exact failure this guards.
  const [synced, setSynced] = React.useState(false);
  const [syncFailed, setSyncFailed] = React.useState(false);

  // Sync seller status from Supabase. The row is the truth: it may have been
  // reviewed elsewhere, and it may never have been written at all.
  React.useEffect(() => {
    if (!app.user?.id) { setSynced(true); return; }
    import('@/lib/market').then(({ loadMySellerApplication }) => loadMySellerApplication(app.user.id)).then(res => {
      if (res.state === 'error') { setSyncFailed(true); setSynced(true); return; }
      if (res.state === 'none') {
        app.setState?.((s: any) => s.sellerStatus === 'none' ? s : ({ ...s, sellerStatus: 'none' }));
        setSynced(true);
        return;
      }
      const dbApp = res.app;
      const dbStatus = dbApp.status === 'approved' ? 'approved' : dbApp.status === 'rejected' ? 'rejected' : 'pending';
      app.setState?.((s: any) => s.sellerStatus === dbStatus ? s : ({
        ...s,
        sellerStatus: dbStatus,
        sellerShop: s.sellerShop ?? { name: dbApp.shop_name, handle: dbApp.shop_handle, tagline: dbApp.tagline },
      }));
      setSynced(true);
    }).catch(() => { setSyncFailed(true); setSynced(true); });
  }, [app.user?.id]);

  const body = () => {
    // Signed-out visitors get the landing page immediately — there is no
    // application to look up, and making them wait would be for nothing.
    if (app.user?.id && !synced) return <SellChecking />;
    if (!reapplying) {
      if (status === 'pending')  return <SellPending onNav={onNav} />;
      if (status === 'approved') return <SellApproved onNav={onNav} />;
      if (status === 'rejected') return <SellRejected onNav={onNav} onReapply={() => { setReapplying(true); setStarted(true); }} />;
    }
    if (started) return <ApplyWizard onNav={onNav} onCancel={() => { setStarted(false); setReapplying(false); }} syncFailed={syncFailed} />;
    return <SellLanding onStart={() => setStarted(true)} />;
  };

  return (
    <div className="page-wrap" style={{ display: 'flex', height: '100%', background: 'var(--bg)' }}>
      <DesktopSidebar active="" onNav={onNav} />
      <main style={{ flex: 1, overflow: 'auto', height: '100%' }} className="no-scrollbar">{body()}</main>
    </div>
  );
};

// ---- Landing / seller-acquisition page ----
function SellLanding({ onStart }) {
  const props = [
    ['users', 'A built-in audience', 'Reach a community that already shops for impact — every listing carries a verified label and real reviews.'],
    ['leaf', 'Vouched, not gatekept', 'Our review is the trust layer buyers love. Approved shops get a verified badge from day one.'],
    ['bolt', 'Tools that run themselves', 'A clean dashboard for products, orders, payouts and messages. Nothing to learn.'],
  ];
  const steps = [
    ['Apply', 'Tell us about your shop, what you make, and your sustainability story. ~10 minutes.'],
    ['We review', 'Our team checks every application by hand — usually within 2 business days.'],
    ['Start selling', 'Once approved, your dashboard unlocks. Add products and take your first order.'],
  ];
  return (
    <div>
      {/* Hero */}
      <div className="sell-hero" style={{ padding: '64px 56px 48px', background: 'linear-gradient(160deg, var(--green-tint), transparent 70%)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 900 }}>
          <span className="chip chip-green" style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>HONUA FOR SELLERS</span>
          <h1 className="font-display" style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.02, margin: '20px 0 0', maxWidth: '16ch' }}>
            Sell the things that help the planet.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--ink-3)', lineHeight: 1.6, margin: '18px 0 0', maxWidth: '52ch', textWrap: 'pretty' }}>
            Open a shop on Honua and put your sustainable goods in front of people who actually care. Apply once — we review every maker by hand.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 30, alignItems: 'center' }}>
            <button className="btn btn-green" onClick={onStart} style={{ padding: '13px 22px', fontSize: 15 }}>
              Start your application <Icon name="arrow" size={16} stroke={2.2} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>Free to apply · no listing fees</span>
          </div>
        </div>
      </div>

      <div className="sell-content" style={{ padding: '44px 56px 64px', maxWidth: 1100 }}>
        {/* Value props */}
        <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {props.map(([ic, t, d]) => (
            <div key={t} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--green-tint)', color: 'var(--green)' }}>
                <Icon name={ic} size={20} stroke={2} />
              </span>
              <h3 className="font-display" style={{ fontSize: 19, fontWeight: 600, margin: '16px 0 6px', letterSpacing: '-0.02em' }}>{t}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 className="font-display" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: '48px 0 18px' }}>How it works</h2>
        <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {steps.map(([t, d], i) => (
            <div key={t} style={{ position: 'relative', padding: '24px 22px', borderRadius: 18, border: '1px solid var(--line)', background: 'var(--surface)' }}>
              <span className="font-display" style={{ fontSize: 13, fontFamily: 'JetBrains Mono', color: 'var(--green)', fontWeight: 600 }}>STEP {i + 1}</span>
              <h3 className="font-display" style={{ fontSize: 20, fontWeight: 600, margin: '8px 0 6px' }}>{t}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>

        {/* Requirements + CTA */}
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 26 }}>
            <h3 className="font-display" style={{ fontSize: 19, fontWeight: 600, margin: '0 0 14px' }}>What you'll need</h3>
            {[
              'A shop name, short bio and logo',
              'The categories and types of things you sell',
              'Your sustainability story — practices and any certifications',
              'Business and tax details for your country',
              'A bank account or Stripe to receive payouts',
            ].map(r => (
              <div key={r} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '9px 0', borderTop: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--green)', marginTop: 1 }}><Icon name="check" size={17} stroke={2.4} /></span>
                <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{r}</span>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 18, padding: 28, background: 'var(--ink-solid)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 className="font-display" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Ready when you are.</h3>
            <p style={{ fontSize: 14, opacity: .75, lineHeight: 1.55, margin: '10px 0 20px' }}>Your progress saves as you go. Most makers finish in under ten minutes.</p>
            <button className="btn" onClick={onStart} style={{ background: '#fff', color: 'var(--ink)', justifyContent: 'center', padding: '12px 18px', fontSize: 15, fontWeight: 600 }}>
              Apply to sell
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- The application wizard ----
const APPLY_STEPS = ['Shop', 'Catalog', 'Impact', 'Business', 'Payouts', 'Review'];

// The four destinations the platform can actually pay into. The wizard used to
// offer two of them, so a maker in Lagos — where Stripe does not operate — met a
// step whose only real answer was a bank field that discarded what they typed.
//
// `kind` is the value stored in seller_applications.payout_method, and it is the
// same vocabulary as payout_methods.kind, so the preference recorded here and the
// destination connected later are comparable rather than two private spellings.
const PAYOUT_OPTIONS: { kind: PayoutKind; title: string; sub: string; mark?: string; brand?: string; icon?: string }[] = [
  { kind: 'stripe', title: 'Connect with Stripe', mark: 'S', brand: '#635bff',
    sub: 'Fastest payouts, handles tax & currency · sent automatically' },
  { kind: 'paypal', title: 'PayPal', mark: 'P', brand: '#0070ba',
    sub: 'Paid to your PayPal address · sent automatically' },
  { kind: 'bank', title: 'Bank transfer', icon: 'bank',
    sub: 'Direct deposit to your account · 2–5 business days' },
  { kind: 'uglycash', title: 'UglyCash', mark: '$', brand: '#111',
    sub: 'Sent to your $handle' },
];

function ApplyWizard({ onNav, onCancel, syncFailed = false }) {
  const app = useApp();
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [f, setF] = React.useState<any>({
    name: '', handle: '', tagline: '', location: '', logo: false,
    categories: [], types: ['Physical goods'], shipsTo: 'Worldwide',
    practices: [], certs: [], impact: '',
    legalName: '', bizType: 'Sole proprietor', country: '', taxId: '', address: '',
    // `payout` holds a PayoutKind. `holder`/`iban` used to live here too and were
    // never sent anywhere — see the note on step 4.
    payout: '', schedule: 'Weekly',
    agreeSeller: false, agreeImpact: false,
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const tog = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x: string) => x !== v) : [...p[k], v] }));

  // Shop logo upload
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const logoRef = React.useRef<HTMLInputElement>(null);
  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    set('logo', true);
  };

  // Step 3 asks for a country as free text, so this resolves it by name or by
  // ISO code and stays quiet when it resolves to neither — better to say nothing
  // than to tell someone Stripe is unavailable because they typed "U.K.".
  const typedCountry = React.useMemo(() => {
    const q = (f.country ?? '').trim().toLowerCase();
    if (q.length < 2) return null;
    return CONNECT_COUNTRIES.find(c => c.name.toLowerCase() === q || c.code.toLowerCase() === q)
      ?? BANK_COUNTRIES.find(c => c.name.toLowerCase() === q || c.code.toLowerCase() === q)
      ?? null;
  }, [f.country]);
  const stripeBlocked = !!typedCountry && !connectSupports(typedCountry.code);

  const canNext = () => {
    if (step === 0) return f.name && f.tagline;
    if (step === 1) return f.categories.length > 0;
    if (step === 2) return f.impact.length > 10 && f.practices.length > 0;
    if (step === 3) return f.legalName && f.country;
    if (step === 4) return !!f.payout;
    if (step === 5) return f.agreeSeller && f.agreeImpact;
    return true;
  };

  // Nothing here moves the seller to "in review" until the row exists.
  //
  // This used to flip the local status first, swallow every error, and toast
  // "Application submitted" unconditionally. When the insert failed the maker
  // was told they had applied, the admin queue stayed empty, and the moment the
  // browser's cached state was lost they were asked to apply again — with no
  // record anywhere that they ever had. Persist, check, then claim.
  const submit = async () => {
    if (saving) return;
    if (!app.user?.id) {
      setSaveError('You need to be signed in to apply. Sign in and your answers will still be here.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // The logo is optional, so a failed upload must not take the application
      // down with it. Previously it threw inside the same try as the insert and
      // the whole submission was lost.
      let logo_url: string | null = null;
      if (logoFile) {
        try {
          const { uploadFile } = await import('@/lib/storage');
          logo_url = await uploadFile('avatars', app.user.id, logoFile);
        } catch { logo_url = null; }
      }
      const { submitSellerApplication } = await import('@/lib/market');
      const res = await submitSellerApplication(app.user.id, { ...f, logo_url });
      if (res.state === 'failed') {
        setSaveError(res.message);
        return;
      }
      app.setState?.(s => ({ ...s, sellerStatus: 'pending', sellerShop: { name: f.name, handle: f.handle || f.name.toLowerCase().replace(/\s+/g, ''), tagline: f.tagline } }));
      app.toast?.({ msg: 'Application submitted', sub: 'We\'ll review it within 2 business days.', kind: 'success', icon: 'check' });
    } catch (err: any) {
      setSaveError(err?.message || 'Something went wrong sending your application. Nothing was saved — try again.');
    } finally {
      setSaving(false);
    }
  };

  const handle = f.handle || f.name.toLowerCase().replace(/[^a-z0-9]+/g, '');

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ padding: '7px 12px' }}><span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrow" size={15} /></span> Exit</button>
          <div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>Seller application</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>Step {step + 1} of {APPLY_STEPS.length} · progress saved</div>
          </div>
        </div>
        <div style={{ width: 440, maxWidth: '40vw' }}><SStepper steps={APPLY_STEPS} current={step} onJump={setStep} compact /></div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'start center', padding: '36px 24px 120px' }}>
        <div style={{ width: '100%', maxWidth: 660 }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--green)', letterSpacing: '.05em' }}>{APPLY_STEPS[step].toUpperCase()}</div>
            <h2 className="font-display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', margin: '6px 0 0' }}>{STEP_TITLE[step]}</h2>
            <p style={{ fontSize: 14.5, color: 'var(--ink-3)', margin: '6px 0 0', lineHeight: 1.55 }}>{STEP_SUB[step]}</p>
          </div>

          {/* STEP 0 — Shop */}
          {step === 0 && (
            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
                <button onClick={() => logoRef.current?.click()} style={{ width: 76, height: 76, borderRadius: 18, flexShrink: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  border: `1.5px dashed ${logoPreview ? 'var(--green)' : 'var(--line-2)'}`, background: logoPreview ? 'transparent' : 'var(--bg-2)', color: 'var(--ink-4)', display: 'grid', placeItems: 'center' }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Icon name="image" size={22} stroke={2} />}
                </button>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Shop logo</span><br />
                  Square PNG or JPG, at least 400×400. {logoPreview ? 'Looks great.' : 'Click to upload.'}
                </div>
              </div>
              <FldText label="Shop name" value={f.name} onChange={v => set('name', v)} placeholder="e.g. The Fix-it Collective" />
              <FldText label="Shop handle" value={handle} onChange={v => set('handle', v.replace(/[^a-z0-9]/gi, '').toLowerCase())} prefix="honua.green/shop/" hint="This is your storefront URL." />
              <FldText label="Tagline" value={f.tagline} onChange={v => set('tagline', v)} placeholder="One line on what you make and why." />
              <FldText label="Location" value={f.location} onChange={v => set('location', v)} placeholder="City, Country" />
            </div>
          )}

          {/* STEP 1 — Catalog */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 24 }}>
              <div>
                <span className="fld-label">What do you sell? <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>Pick all that apply</span></span>
                <ChipGroup options={SELLER_CATEGORIES} value={f.categories} onToggle={v => tog('categories', v)} />
              </div>
              <div>
                <span className="fld-label">Type of offering</span>
                <ChipGroup options={['Physical goods', 'Digital products', 'Services']} value={f.types} onToggle={v => tog('types', v)} />
              </div>
              <FldText label="Where do you ship / operate?" value={f.shipsTo} onChange={v => set('shipsTo', v)} placeholder="e.g. EU & UK, Worldwide" />
            </div>
          )}

          {/* STEP 2 — Impact */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 24 }}>
              <FldText label="Your sustainability story" area value={f.impact} onChange={v => set('impact', v)}
                placeholder="What makes what you sell better for the planet? Materials, process, who makes it…" hint="Buyers see a version of this on your shop. This is the heart of your impact label." />
              <div>
                <span className="fld-label">Sustainability practices <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>Pick all that apply</span></span>
                <ChipGroup options={SELLER_PRACTICES} value={f.practices} onToggle={v => tog('practices', v)} />
              </div>
              <div>
                <span className="fld-label">Certifications <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>Optional</span></span>
                <ChipGroup options={SELLER_CERTS} value={f.certs} onToggle={v => tog('certs', v)} />
              </div>
            </div>
          )}

          {/* STEP 3 — Business */}
          {step === 3 && (
            <div style={{ display: 'grid', gap: 18 }}>
              <FldText label="Legal / registered name" value={f.legalName} onChange={v => set('legalName', v)} placeholder="Business or your full legal name" />
              <div>
                <span className="fld-label">Business type</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Sole proprietor', 'Partnership', 'Company / Ltd', 'Co-operative', 'Non-profit'].map(t => (
                    <button key={t} onClick={() => set('bizType', t)} className={'chip' + (f.bizType === t ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FldText label="Country" value={f.country} onChange={v => set('country', v)} placeholder="Country of registration" />
                <FldText label="Tax ID / VAT" value={f.taxId} onChange={v => set('taxId', v)} placeholder="VAT or tax number" />
              </div>
              <FldText label="Registered address" area value={f.address} onChange={v => set('address', v)} placeholder="Street, city, postal code" />
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 12, background: 'var(--sky-tint)', color: 'var(--sky)' }}>
                <Icon name="lock" size={16} /><span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>Tax details are used only for verification and payouts. They're never shown on your storefront.</span>
              </div>
            </div>
          )}

          {/* STEP 4 — Payouts */}
          {step === 4 && (
            <div style={{ display: 'grid', gap: 16 }}>
              {PAYOUT_OPTIONS.map(o => {
                const on = f.payout === o.kind;
                const unavailable = o.kind === 'stripe' && stripeBlocked;
                return (
                  <div key={o.kind}>
                    <button
                      onClick={() => set('payout', on ? '' : o.kind)}
                      className="opt-row"
                      style={{
                        width: '100%',
                        borderColor: on ? 'var(--green)' : 'var(--line)',
                        background: on ? 'var(--green-tint)' : 'var(--surface)',
                        opacity: unavailable ? .62 : 1,
                      }}
                    >
                      <span style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center',
                        background: o.mark ? o.brand : 'var(--bg-2)', color: o.mark ? '#fff' : 'var(--ink-2)',
                        fontWeight: 700, fontFamily: 'Satoshi', fontSize: 17 }}>
                        {o.mark ?? <Icon name={o.icon} size={20} />}
                      </span>
                      <span style={{ flex: 1, textAlign: 'left' }}>
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{o.title}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{o.sub}</span>
                      </span>
                      {/* Not SBadge: its "approved" state says *Approved*, which on a
                          payout row reads as a decision Honua has made about the
                          seller rather than the choice they just clicked. */}
                      {on && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
                          <Icon name="check" size={14} stroke={2.6} /> Selected
                        </span>
                      )}
                    </button>
                    {/* Named where the choice is made, not discovered after approval.
                        `f.country` is typed by hand, so this only speaks when the
                        text actually resolves to a country Stripe is known not to
                        serve — silence is the honest default for anything else. */}
                    {unavailable && (
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, margin: '8px 2px 0' }}>
                        Stripe doesn&rsquo;t operate in {typedCountry?.name}. Pick PayPal, a bank transfer or UglyCash — those withdrawals are sent by hand and arrive just the same.
                      </div>
                    )}
                  </div>
                );
              })}
              {/* The account details themselves are deliberately not collected here.
                  This step used to take an account holder and an IBAN and drop both
                  on the floor — nothing persisted them, so a maker typed their bank
                  details into a form that discarded them. Destinations belong in
                  payout_methods (migration 042), which is per-seller, masked in
                  every admin view, and audited when revealed. An application row is
                  none of those things. So this asks the preference and the real
                  connection happens on the payouts page once the shop is open. */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 12, background: 'var(--sky-tint)' }}>
                <span style={{ color: 'var(--sky)', display: 'flex' }}><Icon name="lock" size={16} /></span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  We only need the preference now. You&rsquo;ll connect the actual account — PayPal address, bank details or $handle — from your payouts page once you&rsquo;re approved, and you can change or add to it any time.
                </span>
              </div>
              <div>
                <span className="fld-label">Payout schedule</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Daily', 'Weekly', 'Monthly'].map(s => (
                    <button key={s} onClick={() => set('schedule', s)} className={'chip' + (f.schedule === s ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{s}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, padding: '2px 2px' }}>
                Honua takes a <strong style={{ color: 'var(--ink-2)' }}>5% sale fee</strong>. Withdrawals add a <strong style={{ color: 'var(--ink-2)' }}>2%</strong> transfer fee. No monthly or listing costs.
              </div>
            </div>
          )}

          {/* STEP 5 — Review */}
          {step === 5 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <ReviewCard title="Shop" onEdit={() => setStep(0)} rows={[['Name', f.name || '—'], ['Handle', '@' + (handle || '—')], ['Tagline', f.tagline || '—'], ['Location', f.location || '—']]} />
              <ReviewCard title="Catalog" onEdit={() => setStep(1)} rows={[['Categories', f.categories.join(', ') || '—'], ['Types', f.types.join(', ')], ['Ships to', f.shipsTo]]} />
              <ReviewCard title="Impact" onEdit={() => setStep(2)} rows={[['Practices', f.practices.join(', ') || '—'], ['Certs', f.certs.join(', ') || 'None'], ['Story', (f.impact || '—').slice(0, 90) + (f.impact.length > 90 ? '…' : '')]]} />
              <ReviewCard title="Business & payouts" onEdit={() => setStep(3)} rows={[['Legal name', f.legalName || '—'], ['Type', f.bizType], ['Country', f.country || '—'], ['Payout', PAYOUT_KIND_LABEL[f.payout as PayoutKind] ?? '—'], ['Schedule', f.schedule]]} />
              <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                <CheckRow checked={f.agreeSeller} onToggle={() => set('agreeSeller', !f.agreeSeller)} policyHref="/seller-policy" sub="Listing standards, fulfilment timelines, returns and the fee schedule." />
                <CheckRow checked={f.agreeImpact} onToggle={() => set('agreeImpact', !f.agreeImpact)} title="I'll keep my impact claims honest" sub="Everything in my listings is accurate and I can back up sustainability claims if asked." />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer nav */}
      <div style={{ position: 'sticky', bottom: 0, borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
        {/* A failed submission is stated here, next to the button that failed,
            and the wizard stays put with every answer intact. A toast would have
            scrolled away and left the maker believing they had applied. */}
        {saveError && (
          <div style={{ padding: '12px 40px', background: sTint('var(--clay)', 10), borderBottom: '1px solid ' + sTint('var(--clay)', 22), fontSize: 13, color: 'var(--clay)', lineHeight: 1.5 }}>
            <strong>Not submitted.</strong> {saveError}
          </div>
        )}
        {syncFailed && !saveError && (
          <div style={{ padding: '12px 40px', background: sTint('var(--sun)', 10), borderBottom: '1px solid ' + sTint('var(--sun)', 22), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            We couldn&rsquo;t check whether you have applied before. If you already have one in review, submitting again will file a second application.
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px' }}>
          <button className="btn btn-ghost" onClick={() => step === 0 ? onCancel() : setStep(s => s - 1)} style={{ padding: '10px 18px' }}>{step === 0 ? 'Cancel' : 'Back'}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{step + 1}/{APPLY_STEPS.length}</span>
            {step < APPLY_STEPS.length - 1 ? (
              <button className="btn btn-green" disabled={!canNext()} onClick={() => setStep(s => s + 1)} style={{ padding: '10px 22px', opacity: canNext() ? 1 : .45, cursor: canNext() ? 'pointer' : 'not-allowed' }}>Continue <Icon name="arrow" size={15} stroke={2.2} /></button>
            ) : (
              <button className="btn btn-green" disabled={!canNext() || saving} onClick={submit} style={{ padding: '10px 22px', opacity: (canNext() && !saving) ? 1 : .45, cursor: (canNext() && !saving) ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Submitting…' : saveError ? 'Try again' : 'Submit application'} <Icon name="check" size={15} stroke={2.4} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const STEP_TITLE = ['About your shop', 'What you sell', 'Your impact story', 'Business & tax', 'Getting paid', 'Review & submit'];
const STEP_SUB = [
  'The basics buyers see first.',
  'Helps us route your application and place you in the right categories.',
  'The trust layer that makes Honua, Honua. Tell us why your goods are better.',
  'For verification and payouts only — never shown publicly.',
  'Choose how you\'d like to receive your earnings.',
  'One last look before it goes to our review team.',
];

function ReviewCard({ title, rows, onEdit }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--surface)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        <button onClick={onEdit} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="pencil" size={13} /> Edit</button>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13.5 }}>
            <span style={{ width: 110, flexShrink: 0, color: 'var(--ink-4)' }}>{k}</span>
            <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Status screens ----
function StatusShell({ children }) {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%', padding: '48px 24px' }}><div style={{ width: '100%', maxWidth: 600 }}>{children}</div></div>;
}

// Shown for the moment between mount and the database answering. Deliberately
// quiet: the wrong thing to show here is either of the two real answers.
function SellChecking() {
  return (
    <StatusShell>
      <div style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
        <span style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--bg-2)', display: 'inline-grid', placeItems: 'center' }}><Icon name="clock" size={26} /></span>
        <p style={{ fontSize: 14.5, marginTop: 16 }}>Checking your seller status…</p>
      </div>
    </StatusShell>
  );
}

function SellPending({ onNav }) {
  const app = useApp();
  const shop = app.state?.sellerShop || { name: 'Your shop' };
  const timeline = [
    ['Submitted', 'We\'ve got your application.', 'done'],
    ['In review', 'A human is checking your shop and impact claims.', 'active'],
    ['Decision', 'You\'ll get a notification — usually within 2 business days.', 'todo'],
  ];
  return (
    <StatusShell>
      <div style={{ textAlign: 'center' }}>
        <span style={{ width: 64, height: 64, borderRadius: 20, background: sTint('var(--sun)', 18), color: 'var(--sun)', display: 'inline-grid', placeItems: 'center' }}><Icon name="clock" size={30} stroke={2} /></span>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', margin: '20px 0 0' }}>Application in review</h1>
        <p style={{ fontSize: 15.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 0' }}>Thanks for applying with <strong style={{ color: 'var(--ink-2)' }}>{shop.name}</strong>. We review every maker by hand to keep the marketplace trustworthy.</p>
      </div>
      <div style={{ marginTop: 30, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 24 }}>
        {timeline.map(([t, d, state], i) => (
          <div key={t} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                background: state === 'done' ? 'var(--green)' : state === 'active' ? 'var(--sun)' : 'var(--bg-2)',
                color: state === 'todo' ? 'var(--ink-4)' : '#fff', border: state === 'todo' ? '1px solid var(--line)' : 'none' }}>
                {state === 'done' ? <Icon name="check" size={15} stroke={2.6} /> : state === 'active' ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} /> : i + 1}
              </span>
              {i < timeline.length - 1 && <span style={{ width: 1.5, flex: 1, minHeight: 26, background: 'var(--line)', margin: '4px 0' }} />}
            </div>
            <div style={{ paddingBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>{t} {state === 'active' && <SBadge status="in-review" size="sm" />}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 2 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={() => onNav?.('marketplace')}>Back to marketplace</button>
      </div>
      {/* The "open admin review" shortcut and the line under it described a demo
          where anyone could approve themselves. The queue is real now — it lives
          behind sellers.review in the console — so neither belongs on the
          applicant's screen. */}
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', marginTop: 14, lineHeight: 1.5 }}>Your application is on file. You&rsquo;ll be notified as soon as a reviewer has looked at it.</p>
    </StatusShell>
  );
}

function SellApproved({ onNav }) {
  const app = useApp();
  const shop = app.state?.sellerShop || { name: 'Your shop' };
  return (
    <StatusShell>
      <div style={{ textAlign: 'center' }}>
        <span style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--green-tint)', color: 'var(--green)', display: 'inline-grid', placeItems: 'center' }}><Icon name="check" size={32} stroke={2.6} /></span>
        <h1 className="font-display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em', margin: '20px 0 0' }}>You're approved</h1>
        <p style={{ fontSize: 15.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 0' }}><strong style={{ color: 'var(--ink-2)' }}>{shop.name}</strong> is now a verified Honua shop. Your dashboard is unlocked — add your first product and you're live.</p>
      </div>
      <div style={{ marginTop: 28, display: 'grid', gap: 10 }}>
        <button className="btn btn-green" onClick={() => onNav?.('seller')} style={{ justifyContent: 'center', padding: '13px', fontSize: 15 }}>Go to your dashboard <Icon name="arrow" size={16} stroke={2.2} /></button>
        <button className="btn btn-ghost" onClick={() => onNav?.('marketplace')} style={{ justifyContent: 'center', padding: '13px' }}>View the marketplace</button>
      </div>
    </StatusShell>
  );
}

function SellRejected({ onNav, onReapply }) {
  const app = useApp();
  return (
    <StatusShell>
      <div style={{ textAlign: 'center' }}>
        <span style={{ width: 64, height: 64, borderRadius: 20, background: sTint('var(--clay)', 16), color: 'var(--clay)', display: 'inline-grid', placeItems: 'center' }}><Icon name="close" size={30} stroke={2.4} /></span>
        <h1 className="font-display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', margin: '20px 0 0' }}>We couldn't approve this yet</h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 0' }}>A reviewer left notes on what to strengthen — usually clearer impact evidence or business details. You can revise and re-apply anytime.</p>
      </div>
      <div style={{ marginTop: 26, display: 'grid', gap: 10 }}>
        {/* Re-applying is a local intent, not a status change. Clearing
            `sellerStatus` here would only have been undone by the next sync,
            because the stored application is still rejected until a new one
            is filed. */}
        <button className="btn btn-green" onClick={onReapply} style={{ justifyContent: 'center', padding: '13px' }}>Revise & re-apply</button>
        <button className="btn btn-ghost" onClick={() => app.toast?.({ msg: 'Opening…', sub: 'Support docs would open here.', icon: 'comment' })} style={{ justifyContent: 'center', padding: '13px' }}>Contact the review team</button>
      </div>
    </StatusShell>
  );
}
