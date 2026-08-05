// The shape of a broadcast, agreed between the compose screen and the route.
//
// Dependency-free on purpose — the console panel imports it in the browser and
// the route imports it on the server, and neither should be pulling the other's
// dependencies along.
//
// The one rule worth stating up front: a broadcast is a real message to real
// people's inboxes. Everything here that looks like paranoia — the placeholder
// check, the recipient caps, the marketing-preference split — exists because
// the failure mode is not an error page, it is a thousand people receiving
// something wrong that cannot be unsent.

export type Audience = 'all_users' | 'all_sellers' | 'user';
export type Channel = 'both' | 'email' | 'in_app';

export const AUDIENCES: Audience[] = ['all_users', 'all_sellers', 'user'];
export const CHANNELS: Channel[] = ['both', 'email', 'in_app'];

/**
 * In-app notifications are one INSERT ... SELECT, so the ceiling is generous;
 * it is here to stop a runaway rather than to ration anything.
 */
export const MAX_IN_APP = 20_000;

/**
 * Email is one HTTP request per person against Resend. Two hundred of those,
 * five at a time, is about forty round trips — comfortably inside a function's
 * budget. Past that this stops being a compose box and starts being a mailing
 * platform, and the honest answer is to say so rather than to half-send a
 * batch and time out somewhere in the middle of it.
 */
export const MAX_EMAILS = 200;

export const audienceLabel = (audience: Audience, handle?: string | null) => {
  if (audience === 'all_users') return 'Everyone on Honua';
  if (audience === 'all_sellers') return 'All sellers';
  return handle ? `@${handle}` : 'One member';
};

export const channelLabel = (channel: Channel) =>
  channel === 'both' ? 'email + in-app' : channel === 'email' ? 'email' : 'in-app';

// ---- Template variables ----
//
// The templates are written with {{user.name}}-style slots. Two of them the
// server can fill per recipient; the rest — {{suspension_reason}},
// {{post_title}}, {{expiry_date}} — only the admin composing knows.
//
// So the route fills what it can and refuses to send anything still holding a
// slot it cannot. The alternative is an email that reads "Your post
// "{{post_title}}" was removed", which is worse than no email and cannot be
// taken back.

const TOKEN = /\{\{\s*([a-z0-9_.]+)\s*\}\}/gi;

/** The slots the server resolves per recipient. Everything else is the admin's. */
export const RESOLVED_TOKENS = ['user.name', 'user.handle'];

export function renderTemplate(text: string, vars: { name?: string | null; handle?: string | null }) {
  return text.replace(TOKEN, (match, key: string) => {
    const k = key.toLowerCase();
    if (k === 'user.name') return (vars.name || vars.handle || 'there').trim();
    if (k === 'user.handle') return vars.handle ? `@${vars.handle}` : '';
    return match;
  });
}

/**
 * `{{ User.Name }}` → `{{user.name}}`, for the two slots the server fills.
 *
 * The in-app half is rendered in SQL by one INSERT…SELECT covering the whole
 * audience, and it uses plain replace() rather than a regex — replace() has no
 * escape syntax in either argument, so a member whose name contains a backslash
 * is a name and not a backreference. Canonicalising the spelling here is what
 * makes two literal replacements over there sufficient.
 */
export function canonicalizeTokens(text: string) {
  return text.replace(TOKEN, (match, key: string) => {
    const k = key.toLowerCase();
    return RESOLVED_TOKENS.includes(k) ? `{{${k}}}` : match;
  });
}

/** Slots the admin left unfilled. Non-empty means the message is not ready to send. */
export function unresolvedTokens(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(TOKEN)) {
    const key = m[1].toLowerCase();
    if (!RESOLVED_TOKENS.includes(key)) found.add(m[1]);
  }
  return [...found];
}

// ---- History rows ----

export type BroadcastRecord = {
  id: string;
  templateId: string | null;
  subject: string;
  body: string;
  audience: Audience;
  audienceLabel: string;
  targetUserId: string | null;
  channel: Channel;
  recipients: number;
  inAppCreated: number;
  emailsSent: number;
  emailsFailed: number;
  emailError: string | null;
  sentLabel: string | null;
  createdAt: string;
};

export function shapeBroadcast(row: any): BroadcastRecord {
  return {
    id: String(row?.id ?? ''),
    templateId: row?.template_id ?? null,
    subject: row?.subject ?? '',
    body: row?.body ?? '',
    audience: (row?.audience ?? 'user') as Audience,
    audienceLabel: row?.audience_label ?? '',
    targetUserId: row?.target_user_id ?? null,
    channel: (row?.channel ?? 'in_app') as Channel,
    recipients: Number(row?.recipients ?? 0),
    inAppCreated: Number(row?.in_app_created ?? 0),
    emailsSent: Number(row?.emails_sent ?? 0),
    emailsFailed: Number(row?.emails_failed ?? 0),
    emailError: row?.email_error ?? null,
    sentLabel: row?.sent_label ?? null,
    createdAt: row?.created_at ?? new Date().toISOString(),
  };
}

/**
 * One line describing what a send actually did, built from the recorded numbers
 * rather than from what was requested. "Sent" and "delivered to nobody because
 * the mail provider is unconfigured" are different sentences and the history
 * should be able to tell them apart.
 */
export function outcomeLine(r: BroadcastRecord): string {
  const parts: string[] = [];
  if (r.channel !== 'email') parts.push(`${r.inAppCreated} in-app`);
  if (r.channel !== 'in_app') {
    parts.push(`${r.emailsSent} email${r.emailsSent === 1 ? '' : 's'}`);
    if (r.emailsFailed) parts.push(`${r.emailsFailed} failed`);
  }
  return parts.join(' · ') || 'nothing sent';
}
