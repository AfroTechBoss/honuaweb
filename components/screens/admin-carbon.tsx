"use client";
import React from "react";
import { Icon, Modal, ModalHead, ToggleC, SStat, SBadge, sTint, sMoney, useApp } from "@/components/shared";
import { CREDIT_TAGS, listAdminCredits, createAdminCredit, updateAdminCredit, deleteAdminCredit, type AdminCredit } from "@/lib/admin-carbon";

// =====================================================================
// CARBON CREDITS — the listings behind the public market at /carbon
//
// A row here is buyable: retiring one writes a certificate against its name
// and the DB trigger decrements its volume. So the table shows what has
// already been retired against each listing alongside what's left, and a
// listing anyone has bought can only be hidden, never deleted.
// =====================================================================

const BLANK = {
  name: '', region: '', type: '', verifier: '',
  vintage: String(new Date().getFullYear()),
  price: '', volume: '', tag: 'Verified', active: true,
};

type Form = typeof BLANK;

const toForm = (c: AdminCredit): Form => ({
  name: c.name ?? '',
  region: c.region ?? '',
  type: c.type ?? '',
  verifier: c.verifier ?? '',
  vintage: c.vintage ?? '',
  price: ((c.price_cents ?? 0) / 100).toFixed(2),
  volume: String(c.volume_t ?? 0),
  tag: c.tag ?? 'Verified',
  active: c.active !== false,
});

const tonnes = (n: number) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 2 : 0 });

// Live / Sold out / Hidden are three different problems for an admin, so they
// get three different readings rather than one "inactive" catch-all.
function CreditState({ c }: { c: AdminCredit }) {
  if (!c.active) return <SBadge status="inactive" size="sm" />;
  if (c.volume_t <= 0) return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px 2px 7px', borderRadius: 999, background: sTint('var(--sun)'), color: 'var(--sun)', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sun)', flexShrink: 0 }} />
      Sold out
    </span>
  );
  return <SBadge status="active" size="sm" />;
}

export function AdminCarbonCredits({ getToken, log }) {
  const app = useApp();
  // null = still loading. [] means the market genuinely has no listings.
  const [credits, setCredits] = React.useState<AdminCredit[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');
  const [editing, setEditing] = React.useState<AdminCredit | 'new' | null>(null);
  const [form, setForm] = React.useState<Form>(BLANK);
  const [saving, setSaving] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<AdminCredit | null>(null);
  const [rowBusy, setRowBusy] = React.useState<string | null>(null);

  // Privy hands back a fresh function each render; keep it in a ref so loading
  // doesn't retrigger on every re-render.
  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;

  // Privy throws rather than returning null once a session lapses. Either way
  // the answer is the same: no token, so say so instead of hanging on a reject.
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  const load = React.useCallback(async () => {
    const { credits: rows, error } = await listAdminCredits(await token());
    if (error) { setLoadError(error); setCredits([]); return; }
    setLoadError(null);
    setCredits(rows ?? []);
  }, [token]);

  React.useEffect(() => { load(); }, [load]);

  const list = credits ?? [];
  const loading = credits === null;
  // A failed load leaves us with no listings, which is not the same as a market
  // with none — the stats say "unknown" rather than reporting a confident zero.
  const unknown = loading || !!loadError;

  const liveCount = list.filter(c => c.active && c.volume_t > 0).length;
  const hiddenCount = list.filter(c => !c.active).length;
  const soldOutCount = list.filter(c => c.active && c.volume_t <= 0).length;
  const supply = list.filter(c => c.active).reduce((s, c) => s + c.volume_t, 0);
  const retired = list.reduce((s, c) => s + c.retired_t, 0);
  const revenue = list.reduce((s, c) => s + c.revenue_cents, 0);
  const orders = list.reduce((s, c) => s + c.orders, 0);

  const counts = { all: list.length, live: liveCount, sold: soldOutCount, hidden: hiddenCount };
  const shown = list.filter(c => {
    const match =
      filter === 'all' ? true :
      filter === 'live' ? c.active && c.volume_t > 0 :
      filter === 'sold' ? c.active && c.volume_t <= 0 :
      !c.active;
    const term = q.trim().toLowerCase();
    const hit = !term || [c.name, c.region, c.type, c.verifier].some(v => (v ?? '').toLowerCase().includes(term));
    return match && hit;
  });

  const openNew = () => { setForm(BLANK); setEditing('new'); };
  const openEdit = (c: AdminCredit) => { setForm(toForm(c)); setEditing(c); };

  const save = async () => {
    const name = form.name.trim();
    if (!name) return;
    const price_cents = Math.round(parseFloat(form.price) * 100);
    if (!Number.isFinite(price_cents) || price_cents <= 0) {
      app.toast?.({ msg: 'Enter a price above zero', kind: 'error', icon: 'coin' });
      return;
    }
    const volume_t = form.volume.trim() === '' ? 0 : parseFloat(form.volume);
    if (!Number.isFinite(volume_t) || volume_t < 0) {
      app.toast?.({ msg: 'Available volume must be zero or more', kind: 'error', icon: 'co2' });
      return;
    }

    const payload = {
      name, region: form.region.trim(), type: form.type.trim(),
      verifier: form.verifier.trim(), vintage: form.vintage.trim(),
      price_cents, volume_t, tag: form.tag, active: form.active,
    };

    setSaving(true);
    try {
      const jwt = await token();
      if (editing === 'new') {
        const { credit, error } = await createAdminCredit(jwt, payload);
        if (error || !credit) {
          app.toast?.({ msg: "Couldn't create that credit", sub: error, kind: 'error', icon: 'close' });
          return;
        }
        setCredits(cs => [...(cs ?? []), credit]);
        log?.('listed carbon credit', name, 'leaf');
        app.toast?.({ msg: 'Credit listed', sub: name, kind: 'success', icon: 'leaf' });
      } else if (editing) {
        const { credit, error } = await updateAdminCredit(jwt, editing.id, payload);
        if (error || !credit) {
          app.toast?.({ msg: "Couldn't save that credit", sub: error, kind: 'error', icon: 'close' });
          return;
        }
        setCredits(cs => (cs ?? []).map(c => c.id === credit.id ? { ...c, ...credit } : c));
        log?.('updated carbon credit', name, 'pencil');
        app.toast?.({ msg: 'Credit updated', sub: name, kind: 'success', icon: 'check' });
      }
      setEditing(null);
    } finally { setSaving(false); }
  };

  const toggleActive = async (c: AdminCredit) => {
    setRowBusy(c.id);
    try {
      const { credit, error } = await updateAdminCredit(await token(), c.id, { active: !c.active });
      if (error || !credit) {
        app.toast?.({ msg: "Couldn't change visibility", sub: error, kind: 'error', icon: 'close' });
        return;
      }
      setCredits(cs => (cs ?? []).map(x => x.id === c.id ? { ...x, ...credit } : x));
      log?.(credit.active ? 'listed carbon credit' : 'hid carbon credit', c.name, credit.active ? 'check' : 'lock');
      app.toast?.({ msg: credit.active ? 'Credit is live' : 'Credit hidden', sub: c.name, kind: credit.active ? 'success' : undefined, icon: credit.active ? 'leaf' : 'lock' });
    } finally { setRowBusy(null); }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const c = confirmDelete;
    setRowBusy(c.id);
    try {
      const { error } = await deleteAdminCredit(await token(), c.id);
      if (error) {
        app.toast?.({ msg: "Couldn't delete that credit", sub: error, kind: 'error', icon: 'close' });
        return;
      }
      setCredits(cs => (cs ?? []).filter(x => x.id !== c.id));
      log?.('deleted carbon credit', c.name, 'trash');
      app.toast?.({ msg: 'Credit deleted', sub: c.name, icon: 'trash' });
      setConfirmDelete(null);
    } finally { setRowBusy(null); }
  };

  const COLS = '2.2fr 1fr 0.7fr 0.8fr 0.9fr 1fr 0.9fr auto';

  return (
    <div>
      {/* Market health — what's buyable, and what buying it has actually produced */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <SStat label="Live listings" value={unknown ? '—' : liveCount} icon="leaf"
          sub={unknown ? '' : hiddenCount || soldOutCount ? [soldOutCount && `${soldOutCount} sold out`, hiddenCount && `${hiddenCount} hidden`].filter(Boolean).join(' · ') : 'all buyable'} />
        <SStat label="Available supply" value={unknown ? '—' : tonnes(supply)} icon="co2" accent="var(--sky)"
          sub={unknown ? '' : 'tCO₂ left to retire'} />
        <SStat label="Retired" value={unknown ? '—' : tonnes(retired)} icon="check" accent="var(--green-2)"
          sub={unknown ? '' : orders === 0 ? 'no retirements yet' : `tCO₂ across ${orders} retirement${orders === 1 ? '' : 's'}`} />
        <SStat label="Revenue" value={unknown ? '—' : sMoney(revenue / 100, 0)} icon="coin" accent="var(--sun)"
          sub={unknown ? '' : 'from retirements'} />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['all', 'All'], ['live', 'Live'], ['sold', 'Sold out'], ['hidden', 'Hidden']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={'chip' + (filter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>
              {l} <span style={{ fontFamily: 'JetBrains Mono', opacity: .65 }}>· {counts[k]}</span>
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', minWidth: 240 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}><Icon name="search" size={15} /></span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, region, verifier" style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none' }} />
          </div>
          <button className="btn btn-green" onClick={openNew} style={{ flexShrink: 0 }}>
            <Icon name="plus" size={14} /> New credit
          </button>
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint('var(--clay)'), border: '1px solid ' + sTint('var(--clay)', 30), color: 'var(--clay)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="flag" size={15} />
          <span style={{ flex: 1 }}>{loadError}</span>
          <button className="btn btn-ghost" onClick={() => { setCredits(null); load(); }} style={{ fontSize: 12, padding: '5px 11px' }}>Retry</button>
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', fontSize: 11.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          <span>CREDIT</span><span>REGION</span><span>VINTAGE</span>
          <span style={{ textAlign: 'right' }}>PRICE / t</span>
          <span style={{ textAlign: 'right' }}>AVAILABLE</span>
          <span style={{ textAlign: 'right' }}>RETIRED</span>
          <span>STATUS</span><span></span>
        </div>

        {loading && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>Loading listings…</div>}

        {!loading && loadError && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>Listings couldn't be loaded.</div>
        )}

        {!loading && list.length === 0 && !loadError && (
          <div style={{ padding: '54px 32px', textAlign: 'center' }}>
            <Icon name="leaf" size={28} color="var(--ink-3)" />
            <div style={{ marginTop: 10, fontWeight: 600 }}>No credits listed</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4, marginBottom: 16 }}>
              The carbon market stays closed until at least one credit has volume to retire.
            </div>
            <button className="btn btn-green" onClick={openNew}><Icon name="plus" size={14} /> List the first credit</button>
          </div>
        )}

        {!loading && list.length > 0 && shown.length === 0 && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>No credits match.</div>
        )}

        {shown.map(c => {
          const dim = !c.active;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)', alignItems: 'center', opacity: dim ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <span style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: sTint(c.tag === 'Removal' ? 'var(--sky)' : 'var(--green)'), color: c.tag === 'Removal' ? 'var(--sky)' : 'var(--green)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="leaf" size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {[c.tag, c.type, c.verifier].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 13, color: c.region ? undefined : 'var(--ink-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.region || '—'}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12.5, color: c.vintage ? 'var(--ink-3)' : 'var(--ink-4)' }}>{c.vintage || '—'}</span>
              <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600 }}>{sMoney(c.price_cents / 100)}</span>
              <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, color: c.volume_t > 0 ? undefined : 'var(--sun)', fontWeight: 600 }}>
                {c.volume_t > 0 ? tonnes(c.volume_t) : 'none'}
              </span>
              <span className="tabular" style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: 13, color: c.retired_t > 0 ? 'var(--green)' : 'var(--ink-4)' }}>
                {c.retired_t > 0 ? tonnes(c.retired_t) : '—'}
              </span>
              <CreditState c={c} />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <IconBtn icon="pencil" title="Edit listing" onClick={() => openEdit(c)} />
                <IconBtn
                  icon={c.active ? 'lock' : 'check'}
                  title={c.active ? 'Hide from the market' : 'Put back on the market'}
                  tone={c.active ? 'var(--ink-3)' : 'var(--green)'}
                  disabled={rowBusy === c.id}
                  onClick={() => toggleActive(c)}
                />
                <IconBtn icon="trash" title={c.orders > 0 ? 'Retired against — hide it instead' : 'Delete listing'} tone="var(--clay)" disabled={c.orders > 0 || rowBusy === c.id} onClick={() => setConfirmDelete(c)} />
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <CreditForm
          form={form} setForm={setForm}
          credit={editing === 'new' ? null : editing}
          saving={saving}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} width={420}>
          <ModalHead icon="trash" title="Delete this credit?" onClose={() => setConfirmDelete(null)} sub="It disappears from the market entirely. Hiding it keeps the record." />
          <div style={{ padding: '0 24px', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <strong>{confirmDelete.name}</strong> has no retirements against it, so nothing references it.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="btn btn-ghost" onClick={remove} disabled={rowBusy === confirmDelete.id} style={{ color: 'var(--clay)', borderColor: sTint('var(--clay)', 30) }}>
              {rowBusy === confirmDelete.id ? 'Deleting…' : 'Delete credit'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function IconBtn({ icon, title, onClick, tone = 'var(--ink-3)', disabled = false }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{
      width: 32, height: 32, borderRadius: 9, border: '1px solid var(--line)',
      background: 'var(--surface)', color: tone, display: 'grid', placeItems: 'center',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .4 : 1, flexShrink: 0,
    }}>
      <Icon name={icon} size={15} />
    </button>
  );
}

// ---- Create / edit form -------------------------------------------------
function CreditForm({ form, setForm, credit, saving, onSave, onClose }) {
  const set = (k: string) => (e: any) => setForm((f: Form) => ({ ...f, [k]: e.target.value }));
  const priceOk = Number.isFinite(parseFloat(form.price)) && parseFloat(form.price) > 0;
  const canSave = form.name.trim() !== '' && priceOk && !saving;

  return (
    <Modal onClose={onClose} width={620}>
      <ModalHead
        icon="leaf"
        title={credit ? 'Edit credit' : 'List a new credit'}
        onClose={onClose}
        sub={credit ? 'Changes show on the public market immediately.' : 'It goes on the market as soon as it has volume.'}
      />
      <div style={{ padding: '0 24px', display: 'grid', gap: 14 }}>
        <div>
          <span className="fld-label">Project name</span>
          <input className="fld" value={form.name} onChange={set('name')} placeholder="e.g. Mau Forest restoration" autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <span className="fld-label">Region</span>
            <input className="fld" value={form.region} onChange={set('region')} placeholder="e.g. Kenya" />
          </div>
          <div>
            <span className="fld-label">Project type</span>
            <input className="fld" value={form.type} onChange={set('type')} placeholder="e.g. Forestry, DAC, Coastal" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <span className="fld-label">Verifier</span>
            <input className="fld" value={form.verifier} onChange={set('verifier')} placeholder="e.g. Verra VCS, Gold Standard" />
          </div>
          <div>
            <span className="fld-label">Vintage</span>
            <input className="fld" value={form.vintage} onChange={set('vintage')} placeholder="e.g. 2025" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <span className="fld-label">Price per tonne (USD)</span>
            <input className="fld" value={form.price} onChange={set('price')} inputMode="decimal" placeholder="18.20" />
          </div>
          <div>
            <span className="fld-label">Available volume (tCO₂)</span>
            <input className="fld" value={form.volume} onChange={set('volume')} inputMode="decimal" placeholder="12400" />
            <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 5, lineHeight: 1.45 }}>
              What's left to retire. Each purchase decrements it; raise it to restock.
            </div>
          </div>
        </div>

        <div>
          <span className="fld-label">Tag</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CREDIT_TAGS.map(t => (
              <button key={t} onClick={() => setForm((f: Form) => ({ ...f, tag: t }))}
                className={'chip ' + (form.tag === t ? 'chip-green' : '')}
                style={{ cursor: 'pointer', border: form.tag === t ? 'none' : undefined }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-2)' }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Show on the market</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Hidden credits stay editable but can't be bought.</div>
          </div>
          <ToggleC on={form.active} onChange={(v: boolean) => setForm((f: Form) => ({ ...f, active: v }))} />
        </div>

        {credit && credit.orders > 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono', padding: '10px 14px', borderRadius: 10, background: sTint('var(--green)', 8) }}>
            {tonnes(credit.retired_t)} tCO₂ retired · {credit.orders} order{credit.orders === 1 ? '' : 's'} · {sMoney(credit.revenue_cents / 100)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-green" onClick={onSave} disabled={!canSave} style={{ opacity: canSave ? 1 : .5 }}>
          {saving ? 'Saving…' : credit ? 'Save changes' : 'List credit'}
        </button>
      </div>
    </Modal>
  );
}
