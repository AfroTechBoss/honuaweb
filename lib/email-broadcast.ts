import { escapeHtml, SUPPORT_EMAIL } from "./email";

// The email half of an admin broadcast.
//
// Same construction as lib/email-verification.ts — a table with inline styles,
// light palette only — because that is what mail clients render reliably.
//
// One thing differs, and it is the reason this is a separate file rather than a
// third function over there: the footer. The verification emails can say "this
// isn't marketing, so it isn't affected by your email preferences", because
// they are a reply to something the person did. A message to everyone on Honua
// cannot say that. So the footer is chosen from how the message was addressed:
// a message to one person about their account is transactional, a message to a
// whole audience is not, and the second kind has to say how to stop getting it.

const INK = "#0a0d0b";
const INK_3 = "#5c635e";
const LINE = "#e8e7e1";
const BG = "#fafaf7";
const GREEN = "#1f6f3f";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Blank-line-separated blocks become paragraphs; single newlines become breaks. */
function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<tr><td style="padding:16px 32px 0;"><p style="margin:0;font:400 15px/1.65 ${FONT};color:${INK};">${escapeHtml(
          block,
        ).replace(/\n/g, "<br>")}</p></td></tr>`,
    )
    .join("");
}

export function broadcastEmail(opts: {
  subject: string;
  body: string;
  /** True for a message aimed at one person about their own account. */
  direct: boolean;
  appUrl: string;
}) {
  const footer = opts.direct
    ? `You're getting this because of a change to your Honua account. It isn't marketing, so it isn't affected by your email preferences.`
    : `You're getting this because you have email updates turned on for your Honua account. You can turn them off any time in Settings → Notifications.`;

  const settingsUrl = `${opts.appUrl}/settings`;
  const footerHtml = opts.direct
    ? escapeHtml(footer)
    : `You're getting this because you have email updates turned on for your Honua account. You can turn them off any time in <a href="${settingsUrl}" style="color:${INK_3};">your notification settings</a>.`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
<tr><td style="padding:36px 32px 0;">
  <p style="margin:0 0 10px;font:600 11px/1 ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:${GREEN};">Honua</p>
  <h1 style="margin:0;font:600 24px/1.3 ${FONT};color:${INK};letter-spacing:-0.02em;">${escapeHtml(opts.subject)}</h1>
</td></tr>
${paragraphs(opts.body)}
<tr><td style="height:28px;"></td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${LINE};">
  <p style="margin:0;font:400 12px/1.6 ${FONT};color:${INK_3};">${footerHtml}</p>
  <p style="margin:8px 0 0;font:400 12px/1.6 ${FONT};color:${INK_3};">Questions? Reply to this email or write to ${SUPPORT_EMAIL}.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [opts.subject, "", opts.body.trim(), "", "—", footer, `Questions? Write to ${SUPPORT_EMAIL}.`].join("\n");

  return { subject: opts.subject, html, text };
}
