"use client";
import React from "react";
import { Icon, Avatar, Modal, ModalHead, sTint } from "@/components/shared";
import {
  listMembers, setMemberRole, removeMember, relativeSeen, monthYear,
  type AdminMember,
} from "@/lib/admin-members";
import {
  CONSOLE_ROLES, PERMISSION_MATRIX, can, assignableBy, permissionsFor,
  type AdminRole,
} from "@/lib/admin-permissions";

// Who has access to this console, and what each of them can do.
//
// The page this replaces listed four people who do not exist, kept role changes
// in React state that a refresh discarded, and drew a permissions matrix that
// no code anywhere consulted. The matrix was the worst part: it answered "is it
// safe to give this contractor an analyst account?" with a confident no while
// the refund endpoint accepted any allowlisted token.
//
// Three things make this one real:
//
//   1. The roster is the admin_members table (migration 040), which fills
//      itself — every admin who signs in gets a row on sight. There is no
//      invite flow because there is no way to add someone to the Privy
//      allowlist from here; that is a dashboard action. So this shows who
//      actually has access rather than who was once meant to.
//
//   2. Role changes go through /api/admin/members and persist.
//
//   3. The matrix is derived from lib/admin-permissions, the same table the
//      server routes check. A row that says "no refunds" is the reason the
//      refund route returns 403 — not a second copy of the rule that can drift
//      away from the first.
//
// And where a row is *not* enforced yet, it says so. Every row is enforced as
// of migration 044 — the last two, notifications and platform settings, got
// their routes with it — but the badge and the banner stay, because the next
// feature will arrive advisory too and quietly drawing a check for it is the
// failure all of this exists to prevent. An owner deciding who to trust needs
// to know which lines are locks.

const ROLE_COLORS: Record<AdminRole, string> = {
  owner: 'var(--sun)',
  admin: 'var(--sky)',
  moderator: 'var(--green)',
  analyst: 'var(--ink-3)',
};

const ROLE_BLURB: Record<AdminRole, string> = {
  owner: 'Everything, including platform settings and who else gets access.',
  admin: 'All day-to-day operations. Cannot change platform settings or promote admins.',
  moderator: 'Trust & Safety: reports, suspensions, appeals, support. Cannot ban, refund, or touch payouts.',
  analyst: 'Read-only. Analytics and order visibility, no actions.',
};

export function AdminRoles({ getToken, log, adminEmail }: {
  getToken: () => Promise<string | null>;
  log?: (verb: string, target?: string, icon?: string) => void;
  adminEmail?: string | null;
}) {
  const [members, setMembers] = React.useState<AdminMember[] | null>(null);
  const [myRole, setMyRole] = React.useState<AdminRole>('owner');
  const [available, setAvailable] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = React.useState<AdminMember | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const token = React.useCallback(() => tokenRef.current(), []);

  const load = React.useCallback(async () => {
    const res = await listMembers(await token(), { email: adminEmail ?? null });
    if (res.error) { setLoadError(res.error); setMembers([]); return; }
    setLoadError(null);
    setMembers(res.members ?? []);
    setMyRole(res.role ?? 'owner');
    setAvailable(res.available !== false);
  }, [token, adminEmail]);

  React.useEffect(() => { load(); }, [load]);

  // Toasts here are local rather than app.toast: this panel is the one place
  // where the refusal *is* the information ("this is the last owner"), and it
  // should stay on screen next to the row it refers to.
  const say = (msg: string) => { setToast(msg); setTimeout(() => setToast(t => t === msg ? null : t), 4000); };

  const changeRole = async (m: AdminMember, role: AdminRole) => {
    setBusy(true);
    const res = await setMemberRole(await token(), m.did, role);
    setBusy(false);
    setEditId(null);
    if (res.error) { say(res.error); return; }
    log?.('changed role to ' + role, m.name ?? m.email ?? m.did, 'award');
    say(`${m.name ?? m.email ?? 'Member'} is now ${role}`);
    load();
  };

  const drop = async (m: AdminMember) => {
    setBusy(true);
    const res = await removeMember(await token(), m.did);
    setBusy(false);
    setConfirmDrop(null);
    if (res.error) { say(res.error); return; }
    log?.('removed from console', m.name ?? m.email ?? m.did, 'close');
    say(`${m.name ?? m.email ?? 'Member'} removed from the roster`);
    load();
  };

  const loading = members === null;
  const assignable = assignableBy(myRole);
  const canManage = assignable.length > 0;
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { owner: 0, admin: 0, moderator: 0, analyst: 0 };
    (members ?? []).forEach(m => { c[m.role] = (c[m.role] ?? 0) + 1; });
    return c;
  }, [members]);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', marginBottom: 4 }}>ROLES &amp; ACCESS</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Who can do what</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
          Privy decides who gets into the console. This decides what they can touch once they are in.
        </div>
      </div>

      {!available && (
        <Notice tone="var(--sun)" icon="alert">
          Roles are not stored yet — apply <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>supabase/migrations/040_admin_roles.sql</code>.
          Until then every admin who signs in has full access, exactly as before, and the roster below stays empty.
        </Notice>
      )}
      {loadError && <Notice tone="var(--clay)" icon="alert">{loadError}</Notice>}
      {available && !loading && !loadError && !canManage && (
        <Notice tone="var(--sky)" icon="lock">
          You are signed in as <strong>{myRole}</strong>. You can see the roster but only an owner or admin can change it.
        </Notice>
      )}

      {/* ── Roster ───────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Admin team</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 2 }}>
              {loading ? 'Loading…'
                : `${members!.length} ${members!.length === 1 ? 'person has' : 'people have'} signed into the console`}
              {!loading && members!.length > 0 && (
                <> · {CONSOLE_ROLES.filter(r => counts[r]).map(r => `${counts[r]} ${r}`).join(', ')}</>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink-4)' }}>
            <Icon name="lock" size={13} />
            <span>Access is granted in Privy</span>
          </div>
        </div>

        {loading && <div style={{ padding: '28px 22px', fontSize: 13, color: 'var(--ink-4)' }}>Loading the roster…</div>}

        {!loading && members!.length === 0 && (
          <div style={{ padding: '28px 22px', fontSize: 13, color: 'var(--ink-4)' }}>
            {available
              ? 'Nobody on the roster yet. Anyone allowlisted in Privy is added here automatically the first time they open the console.'
              : 'The roster appears once migration 040 is applied.'}
          </div>
        )}

        {!loading && members!.map(m => {
          // What this actor may do to this particular person. An admin can
          // staff up moderators and analysts but cannot touch another admin or
          // the owner; nobody can change their own row. Computed here so the
          // buttons match what the server will accept, rather than offering an
          // action that comes back 403.
          const targetLocked = myRole === 'admin' && (m.role === 'owner' || m.role === 'admin');
          const editable = canManage && !m.isSelf && !targetLocked && available;
          const options = assignable.filter(r => r !== m.role);

          return (
            <div key={m.did} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--line)' }}>
              <Avatar src={m.avatarUrl ?? undefined} name={m.name ?? m.email ?? 'Admin'} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name ?? m.email ?? 'Unnamed admin'}
                  </span>
                  {m.isSelf && <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', background: 'var(--bg-2)', padding: '2px 7px', borderRadius: 5 }}>YOU</span>}
                  {m.handle && <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 500 }}>@{m.handle}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email ?? m.did} · joined {monthYear(m.firstSeenAt)} · seen {relativeSeen(m.lastSeenAt)}
                </div>
              </div>

              {editId === m.did ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {options.map(r => (
                    <button
                      key={r}
                      disabled={busy}
                      onClick={() => changeRole(m, r)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 8, border: '1px solid ' + ROLE_COLORS[r], color: ROLE_COLORS[r], background: sTint(ROLE_COLORS[r], 12), cursor: busy ? 'default' : 'pointer', textTransform: 'capitalize', opacity: busy ? 0.6 : 1 }}
                    >{r}</button>
                  ))}
                  <button disabled={busy} onClick={() => setConfirmDrop(m)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px', color: 'var(--clay)' }}>Remove</button>
                  <button onClick={() => setEditId(null)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    title={ROLE_BLURB[m.role]}
                    style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 8, background: sTint(ROLE_COLORS[m.role], 14), color: ROLE_COLORS[m.role], fontFamily: 'JetBrains Mono', textTransform: 'capitalize' }}
                  >{m.role}</span>
                  {editable
                    ? <button onClick={() => setEditId(m.did)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }}>Change</button>
                    : <span style={{ fontSize: 11.5, color: 'var(--ink-4)', minWidth: 62, textAlign: 'right' }}>
                        {m.isSelf ? 'your role' : targetLocked ? 'owner only' : canManage ? '' : 'view only'}
                      </span>}
                </div>
              )}
            </div>
          );
        })}

        {!loading && members!.length > 0 && (
          <div style={{ padding: '13px 22px', fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.6 }}>
            Removing someone clears their role and their place on this list. It does not revoke console access —
            that lives in the Privy allowlist, and has to be withdrawn there too.
          </div>
        )}
      </div>

      {/* ── What each role holds ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {CONSOLE_ROLES.map(r => (
          <div key={r} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '3px solid ' + ROLE_COLORS[r], borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLORS[r], textTransform: 'capitalize', fontFamily: 'JetBrains Mono' }}>{r}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'JetBrains Mono' }}>{permissionsFor(r).length} perms</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>{ROLE_BLURB[r]}</div>
          </div>
        ))}
      </div>

      {/* ── The matrix ───────────────────────────────────────── */}
      <PermissionMatrix myRole={myRole} />

      {confirmDrop && (
        <Modal onClose={() => setConfirmDrop(null)} width={480}>
          <ModalHead
            icon="close"
            iconColor="var(--clay)"
            title={`Remove ${confirmDrop.name ?? confirmDrop.email ?? 'this member'}?`}
            sub="They lose their role and drop off this roster."
            onClose={() => setConfirmDrop(null)}
          />
          <div style={{ padding: '16px 24px 0', fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            This does not sign them out or revoke console access — that is the Privy allowlist, and you have to
            remove them there as well. If they open the console again before you do, they will be re-added
            automatically as an <strong>admin</strong>.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '20px 24px' }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDrop(null)}>Cancel</button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => drop(confirmDrop)}
              style={{ background: 'var(--clay)', color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Removing…' : 'Remove from roster'}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 8px 30px rgba(0,0,0,.18)', borderRadius: 12, padding: '11px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="alert" size={14} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function Notice({ children, tone = 'var(--sun)', icon = 'alert' }: { children: React.ReactNode; tone?: string; icon?: string }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 12, background: sTint(tone), border: '1px solid ' + sTint(tone, 30), color: tone, fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.55 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name={icon} size={15} /></span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

// ---- Permissions matrix -------------------------------------------------
//
// Every cell is computed with can() — the same function the server routes call.
// Nothing here is a hand-maintained second copy of the rules, so the page
// cannot claim a restriction the API does not apply.
function PermissionMatrix({ myRole }: { myRole: AdminRole }) {
  const [onlyEnforced, setOnlyEnforced] = React.useState(false);

  const rows = onlyEnforced ? PERMISSION_MATRIX.filter(r => r.enforced) : PERMISSION_MATRIX;
  const advisory = PERMISSION_MATRIX.filter(r => !r.enforced).length;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Permissions matrix</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 2 }}>
            Read from the same table the API checks. You are <strong style={{ color: ROLE_COLORS[myRole] }}>{myRole}</strong>.
          </div>
        </div>
        <button
          onClick={() => setOnlyEnforced(v => !v)}
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          {onlyEnforced ? `Show all ${PERMISSION_MATRIX.length}` : `Only enforced (${PERMISSION_MATRIX.length - advisory})`}
        </button>
      </div>

      {advisory > 0 && !onlyEnforced && (
        <div style={{ padding: '11px 22px', borderBottom: '1px solid var(--line)', background: sTint('var(--sun)', 7), fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--sun)' }}>{advisory} of these {PERMISSION_MATRIX.length} rows are not enforced yet.</strong>{' '}
          Those screens still run entirely in the browser over mock data, so there is no request to refuse.
          They are shown because the intent is real — but until each one has a route, treat the row as a note, not a lock.
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 22px', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-4)', letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 500, width: '44%' }}>Capability</th>
              {CONSOLE_ROLES.map(r => (
                <th key={r} style={{ textAlign: 'center', padding: '12px 18px', fontSize: 11, fontFamily: 'JetBrains Mono', letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 700, color: ROLE_COLORS[r] }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} style={{ borderTop: '1px solid var(--line)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-2)' }}>
                <td style={{ padding: '11px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 500 }}>{row.label}</span>
                    {!row.enforced && (
                      <span title="Not gated server-side yet" style={{ fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--sun)', background: sTint('var(--sun)', 14), padding: '1px 6px', borderRadius: 5, letterSpacing: '.03em' }}>NOT ENFORCED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3, fontFamily: row.enforced ? 'JetBrains Mono' : 'inherit', lineHeight: 1.5 }}>{row.note}</div>
                </td>
                {CONSOLE_ROLES.map(r => (
                  <td key={r} style={{ textAlign: 'center', padding: '11px 18px' }}>
                    <PermCell
                      full={can(r, row.full)}
                      partial={row.partial && can(r, row.partial.perm) ? row.partial.label : null}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermCell({ full, partial }: { full: boolean; partial: string | null }) {
  if (full) return <span style={{ color: 'var(--green)', fontSize: 13 }} aria-label="allowed">✓</span>;
  if (partial) return (
    <span style={{ fontSize: 11, color: 'var(--sky)', fontFamily: 'JetBrains Mono', background: sTint('var(--sky)', 12), padding: '2px 6px', borderRadius: 5 }}>{partial}</span>
  );
  return <span style={{ color: 'var(--line-2)', fontSize: 13 }} aria-label="not allowed">—</span>;
}
