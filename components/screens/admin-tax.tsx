"use client";
import React from "react";
import { Icon, Modal, ModalHead, SStat, sTint, useApp } from "@/components/shared";
import {
  getTaxReport, listTaxProfiles, reviewTaxProfile, checkSellerVat, downloadTaxReport,
  type TaxReport, type ReportScope, type AdminTaxProfile, type SellerReportStatus, type VatCheck,
} from "@/lib/admin-dac7";
import { countryName, regimeFor, EXCLUSION_MAX_SALES, EXCLUSION_MAX_EUR, type TaxStatus } from "@/lib/tax";

// =====================================================================
// TAX REPORTING — DAC7 (EU), OECD model rules (UK, CA, AU, NZ), US totals
//
// Two jobs. The review queue: sellers' tax details as they submit them, to be
// checked against what they look like (a TIN in the right shape for the
// country, a VAT number VIES recognises) before the January filing depends on
// them. And the report: per seller, per quarter, who is reportable for a year,
// with the CSV that goes to the accountant or into the tax office's portal.
//
// Every export is recorded in the audit log by the route — the file holds tax
// IDs, dates of birth and bank details for every seller in it.
// =====================================================================

const SCOPES: [ReportScope, string][] = [
  ['dac7', 'EU · DAC7'],
  ['oecd', 'UK · CA · AU · NZ'],
  ['us', 'US'],
  ['all', 'All sellers'],
];

const PROFILE_FILTERS: [TaxStatus | 'all', string][] = [
  ['submitted', 'To review'],
  ['rejected', 'Sent back'],
  ['verified', 'Verified'],
  ['all', 'All'],
];

const STATUS_META: Record<SellerReportStatus, { label: string; color: string }> = {
  reportable: { label: 'Reportable', color: 'var(--green)' },
  excluded: { label: 'Under threshold', color: 'var(--ink-3)' },
  missing_details: { label: 'No tax details', color: 'var(--clay)' },
  rate_needed: { label: 'Needs EUR rate', color: 'var(--sun)' },
  not_in_scope: { label: 'Not in scope', color: 'var(--ink-4)' },
};

const usd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eur = (v: number) => `€${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color, background: sTint(color), padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function Banner({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, padding: '12px 16px', borderRadius: 12, background: sTint(tone), border: '1px solid ' + sTint(tone, 30), color: tone, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.5 }}>
      <Icon name="flag" size={15} />
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

const sectionHead = { fontSize: 15, fontWeight: 600, margin: '26px 0 12px', display: 'flex', alignItems: 'center', gap: 8 } as const;
const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 } as const;
const label = { fontSize: 10.5, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em' } as const;
const input = { padding: '8px 11px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, outline: 'none', color: 'var(--ink)' } as const;

export function AdminTax({ getToken, adminEmail }: { getToken: any; adminEmail?: string | null }) {
  const app = useApp();
  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(async (): Promise<string | null> => {
    try { return await tokenRef.current(); } catch { return null; }
  }, []);

  // Reports are filed for the year just ended, so that's the default.
  const thisYear = new Date().getUTCFullYear();
  const [year, setYear] = React.useState(thisYear - 1);
  const [scope, setScope] = React.useState<ReportScope>('dac7');
  const [rateText, setRateText] = React.useState('');
  const rate = (() => { const n = Number(rateText); return rateText.trim() && Number.isFinite(n) && n > 0 && n <= 10 ? n : null; })();

  const [report, setReport] = React.useState<TaxReport | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [loadingReport, setLoadingReport] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const [profileFilter, setProfileFilter] = React.useState<TaxStatus | 'all'>('submitted');
  const [profiles, setProfiles] = React.useState<AdminTaxProfile[] | null>(null);
  const [profilesAvailable, setProfilesAvailable] = React.useState(true);
  const [profilesError, setProfilesError] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<AdminTaxProfile | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [vat, setVat] = React.useState<Record<string, VatCheck>>({});

  const loadReport = React.useCallback(async () => {
    setLoadingReport(true);
    const { report: r, error } = await getTaxReport(await token(), year, scope, rate);
    setReport(r ?? null);
    setReportError(error ?? null);
    setLoadingReport(false);
  }, [token, year, scope, rate]);

  const loadProfiles = React.useCallback(async () => {
    const { profiles: rows, available, error } = await listTaxProfiles(await token(), profileFilter);
    setProfiles(rows);
    setProfilesAvailable(available);
    setProfilesError(error ?? null);
  }, [token, profileFilter]);

  React.useEffect(() => { loadReport(); }, [loadReport]);
  React.useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const exportCsv = async () => {
    setExporting(true);
    const { error } = await downloadTaxReport(await token(), year, scope, rate, adminEmail);
    setExporting(false);
    if (error) app.toast?.({ msg: "Couldn't export the report", sub: error, kind: 'error', icon: 'close' });
    else app.toast?.({ msg: `Exported ${year} report`, sub: 'Recorded in the activity log.', icon: 'check' });
  };

  const verify = async (p: AdminTaxProfile) => {
    setBusyId(p.seller_id);
    const { error } = await reviewTaxProfile(await token(), p.seller_id, 'verify', '', adminEmail);
    setBusyId(null);
    if (error) { app.toast?.({ msg: "Couldn't verify those details", sub: error, kind: 'error', icon: 'close' }); return; }
    app.toast?.({ msg: `Verified ${displayName(p)}`, kind: 'success', icon: 'check' });
    loadProfiles();
    loadReport();
  };

  const reject = async (p: AdminTaxProfile, note: string) => {
    setBusyId(p.seller_id);
    const { error } = await reviewTaxProfile(await token(), p.seller_id, 'reject', note, adminEmail);
    setBusyId(null);
    if (error) { app.toast?.({ msg: "Couldn't send those details back", sub: error, kind: 'error', icon: 'close' }); return; }
    app.toast?.({ msg: `Sent back to ${displayName(p)}`, sub: 'Withdrawals are paused until they correct it.', icon: 'close' });
    setRejecting(null);
    loadProfiles();
    loadReport();
  };

  const runVat = async (p: AdminTaxProfile) => {
    setBusyId(p.seller_id);
    const { vat: v, error } = await checkSellerVat(await token(), p.seller_id);
    setBusyId(null);
    setVat(m => ({ ...m, [p.seller_id]: v ?? { valid: null, error } }));
  };

  const t = report?.totals;
  const rows = report?.rows ?? [];
  const unavailable = report && !report.available;
  const needsRate = scope !== 'us' && !rate;

  return (
    <div>
      {/* ---------------- Report ---------------- */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...label, marginBottom: 5 }}>YEAR</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={input}>
            {Array.from({ length: 6 }, (_, i) => thisYear - i).map(y => (
              <option key={y} value={y}>{y}{y === thisYear ? ' (so far)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ ...label, marginBottom: 5 }}>SELLERS</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {SCOPES.map(([k, l]) => (
              <button key={k} onClick={() => setScope(k)} className={'chip' + (scope === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ ...label, marginBottom: 5 }}>EUR PER USD</div>
          <input value={rateText} onChange={e => setRateText(e.target.value)} inputMode="decimal" placeholder="e.g. 0.92"
            style={{ ...input, width: 110, fontFamily: 'JetBrains Mono' }} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={loadReport} disabled={loadingReport}>
            <Icon name="clock" size={14} /> {loadingReport ? 'Loading…' : 'Refresh'}
          </button>
          <button className="btn btn-green" onClick={exportCsv} disabled={exporting || !!unavailable || rows.length === 0}>
            <Icon name="package" size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {unavailable && <Banner tone="var(--clay)">Tax reporting isn't set up on the database yet — {report?.fix}.</Banner>}
      {reportError && <Banner tone="var(--clay)">{reportError}</Banner>}
      {!unavailable && needsRate && (
        <Banner tone="var(--sun)">
          Sellers with fewer than {EXCLUSION_MAX_SALES} sales are excluded only if they also made no more than {eur(EXCLUSION_MAX_EUR)}. Sales are in US dollars, so enter the
          exchange rate your accountant uses for {year} (usually the ECB's average for the year) to apply that test. Until then those sellers show as "Needs EUR rate".
        </Banner>
      )}
      {year === thisYear && <Banner tone="var(--sky)">{year} isn't over — these are the totals so far, not a report to file.</Banner>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <SStat label="Reportable sellers" value={t ? t.reportable : '—'} icon="flag" accent="var(--green)"
          sub={t ? `of ${t.sellers} who sold in ${year}` : ''} />
        <SStat label="Under threshold" value={t ? t.excluded : '—'} icon="check" accent="var(--ink-3)"
          sub={t ? (rate ? `< ${EXCLUSION_MAX_SALES} sales and ≤ ${eur(EXCLUSION_MAX_EUR)}` : 'needs the EUR rate') : ''} />
        <SStat label="Missing tax details" value={t ? t.missingDetails : '—'} icon="close" accent="var(--clay)"
          sub={t ? (t.missingDetails ? 'sold, but never filled in the form' : 'everyone who sold has filed') : ''} />
        <SStat label="Consideration" value={t ? usd(t.netCents) : '—'} icon="coin" accent="var(--sky)"
          sub={t ? 'after refunds and Honua’s fee' : ''} />
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-2)', textAlign: 'left' }}>
                {['Seller', 'Residence', 'Status', 'Sales', 'Q1', 'Q2', 'Q3', 'Q4', 'Consideration', 'In EUR'].map(h => (
                  <th key={h} style={{ ...label, padding: '10px 14px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>
                  {loadingReport ? 'Loading…' : unavailable ? '—' : `No delivered sales in ${year} for these sellers.`}
                </td></tr>
              )}
              {rows.map(r => {
                const m = STATUS_META[r.status];
                return (
                  <tr key={r.sellerId} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>
                        {r.handle ? `@${r.handle}` : r.sellerId.slice(0, 8)}{r.deleted ? ' · account deleted' : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{r.country ? countryName(r.country) : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <Chip label={m.label} color={m.color} />
                        {r.taxStatus === 'rejected' && <Chip label="details sent back" color="var(--clay)" />}
                        {r.taxStatus === 'submitted' && <Chip label="unreviewed" color="var(--sun)" />}
                      </div>
                    </td>
                    <td className="tabular" style={{ padding: '10px 14px' }}>{r.sales}</td>
                    {r.quarters.map((q, i) => (
                      <td key={i} className="tabular" style={{ padding: '10px 14px', color: q.sales ? undefined : 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                        {q.sales ? <>{usd(q.netCents)} <span style={{ color: 'var(--ink-4)', fontSize: 11 }}>· {q.sales}</span></> : '—'}
                      </td>
                    ))}
                    <td className="tabular" style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{usd(r.netCents)}</td>
                    <td className="tabular" style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--ink-3)' }}>{r.netEur !== null ? eur(r.netEur) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 10, lineHeight: 1.6 }}>
        A sale counts in the quarter it was delivered. Consideration is what the seller was paid: the price less refunds and Honua's
        fee, which DAC7 also asks for per quarter (it's in the CSV). US sellers paid through Stripe Connect get their 1099-K from Stripe;
        the US view is for payouts sent any other way. The CSV carries every field the tax office's DPI return asks for — it isn't the XML itself.
      </div>

      {/* ---------------- Review queue ---------------- */}
      <div style={sectionHead}><Icon name="check" size={16} /> Sellers' tax details</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {PROFILE_FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setProfileFilter(k)} className={'chip' + (profileFilter === k ? ' chip-green' : '')} style={{ cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {!profilesAvailable && <Banner tone="var(--clay)">Apply supabase/migrations/058_dac7_seller_tax.sql to collect sellers' tax details.</Banner>}
      {profilesError && <Banner tone="var(--clay)">{profilesError}</Banner>}

      {profiles === null && <div style={{ ...card, padding: 40, textAlign: 'center', color: 'var(--ink-4)' }}>Loading…</div>}
      {profiles?.length === 0 && profilesAvailable && (
        <div style={{ ...card, padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ fontWeight: 600 }}>{profileFilter === 'submitted' ? 'Nothing to review' : 'Nothing here'}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            Sellers fill this in on their Payouts tab before their first withdrawal.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(profiles ?? []).map(p => (
          <ProfileCard key={p.seller_id} p={p} busy={busyId === p.seller_id} vat={vat[p.seller_id]}
            onVerify={() => verify(p)} onReject={() => setRejecting(p)} onCheckVat={() => runVat(p)} />
        ))}
      </div>

      {rejecting && (
        <RejectModal p={rejecting} busy={busyId === rejecting.seller_id}
          onCancel={() => setRejecting(null)} onConfirm={note => reject(rejecting, note)} />
      )}
    </div>
  );
}

const displayName = (p: AdminTaxProfile) =>
  (p.entity_type === 'entity' ? p.legal_name : [p.first_name, p.last_name].filter(Boolean).join(' ')) || (p.handle ? `@${p.handle}` : 'this seller');

function Field({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div style={label}>{k}</div>
      <div style={{ fontSize: 13, marginTop: 2, fontFamily: mono ? 'JetBrains Mono' : undefined, wordBreak: 'break-word' }}>{v || <span style={{ color: 'var(--ink-4)' }}>—</span>}</div>
    </div>
  );
}

function ProfileCard({ p, busy, vat, onVerify, onReject, onCheckVat }: {
  p: AdminTaxProfile; busy: boolean; vat?: VatCheck;
  onVerify: () => void; onReject: () => void; onCheckVat: () => void;
}) {
  const entity = p.entity_type === 'entity';
  const regime = regimeFor(p.country);
  const statusColor = p.status === 'verified' ? 'var(--green)' : p.status === 'rejected' ? 'var(--clay)' : 'var(--sun)';
  const address = [p.address_line1, p.address_line2, p.city, p.region, p.postal_code].filter(Boolean).join(', ');

  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{displayName(p)}</span>
            <Chip label={p.status} color={statusColor} />
            <Chip label={entity ? 'business' : 'individual'} color="var(--ink-3)" />
            <Chip label={regime === 'dac7' ? 'DAC7' : regime === 'oecd' ? 'OECD rules' : regime === 'us' ? 'US' : 'not in scope'} color="var(--sky)" />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 3 }}>
            {p.handle ? `@${p.handle} · ` : ''}updated {new Date(p.updated_at).toLocaleDateString()}
          </div>
        </div>
        {p.status !== 'verified' && (
          <button className="btn btn-green" onClick={onVerify} disabled={busy}><Icon name="check" size={14} /> Verify</button>
        )}
        {p.status !== 'rejected' && (
          <button className="btn btn-ghost" onClick={onReject} disabled={busy}><Icon name="close" size={14} /> Send back</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, padding: '14px 18px', borderTop: '1px solid var(--line)', background: 'var(--bg-2)' }}>
        {entity
          ? <><Field k="LEGAL NAME" v={p.legal_name} /><Field k="REGISTRATION NO." v={p.business_reg_number} mono /></>
          : <><Field k="NAME" v={[p.first_name, p.last_name].filter(Boolean).join(' ')} /><Field k="DATE OF BIRTH" v={p.date_of_birth} mono /></>}
        <Field k="RESIDENCE" v={countryName(p.country)} />
        <Field k="TIN" v={p.no_tin ? 'None issued' : <>{p.tin}{p.tin_country && p.tin_country !== p.country ? ` (${p.tin_country})` : ''}</>} mono />
        <div style={{ gridColumn: 'span 2' }}><Field k="ADDRESS" v={address} /></div>
        {p.no_tin && !entity && <Field k="PLACE OF BIRTH" v={[p.birth_city, p.birth_country && countryName(p.birth_country)].filter(Boolean).join(', ')} />}
        {entity && p.permanent_establishments?.length > 0 && <Field k="EU ESTABLISHMENTS" v={p.permanent_establishments.join(', ')} mono />}
        <div>
          <div style={label}>VAT</div>
          <div style={{ fontSize: 13, marginTop: 2, fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {p.vat_number || <span style={{ color: 'var(--ink-4)' }}>—</span>}
            {p.vat_number && regime === 'dac7' && !vat && (
              <button onClick={onCheckVat} disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--sky)', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}>check VIES</button>
            )}
          </div>
          {vat && (
            <div style={{ fontSize: 11.5, marginTop: 4, color: vat.valid === true ? 'var(--green)' : vat.valid === false ? 'var(--clay)' : 'var(--ink-3)' }}>
              {vat.valid === true ? `Valid${vat.name ? ` — ${vat.name}` : ''}` : vat.valid === false ? 'Not a valid VAT number' : vat.error}
            </div>
          )}
        </div>
      </div>

      {p.status === 'rejected' && p.review_note && (
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line)', fontSize: 12.5, color: 'var(--clay)' }}>
          Sent back: {p.review_note}
        </div>
      )}
    </div>
  );
}

function RejectModal({ p, busy, onCancel, onConfirm }: { p: AdminTaxProfile; busy: boolean; onCancel: () => void; onConfirm: (note: string) => void }) {
  const [note, setNote] = React.useState('');
  return (
    <Modal onClose={onCancel} width={520}>
      <ModalHead icon="close" iconColor="var(--clay)" title={`Send back ${displayName(p)}'s tax details?`} onClose={onCancel} />
      <div style={{ padding: '18px 24px 0' }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          Their withdrawals pause until they correct the form. They get a notification with your note, and it shows next to the form on their Payouts tab.
        </p>
        <label style={{ display: 'block', ...label, color: 'var(--ink-3)', marginTop: 18, marginBottom: 6 }}>WHAT NEEDS CORRECTING — SENT TO THE SELLER</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={500}
          placeholder="e.g. The TIN doesn't match the format for Italy — a codice fiscale is 16 characters."
          style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg-2)', fontSize: 13.5, lineHeight: 1.55, resize: 'vertical', outline: 'none', color: 'var(--ink)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px 22px' }}>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn" style={{ background: 'var(--clay)', color: '#fff' }} onClick={() => onConfirm(note.trim())} disabled={busy || !note.trim()}>
          {busy ? 'Working…' : 'Send back'}
        </button>
      </div>
    </Modal>
  );
}
