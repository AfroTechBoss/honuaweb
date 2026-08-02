import { escapeHtml } from "./email";
import { VERIFICATION_MEANS, VERIFICATION_CRITERIA } from "./verification-copy";

// The two emails the review queue can send. Server-only: they are built in the
// approval route, which is the only place that knows the outcome.
//
// Written as a table with inline styles because that is what mail clients
// render reliably — Outlook has no flexbox, Gmail strips <style> blocks. Light
// palette only, for the same reason: prefers-color-scheme support is uneven
// enough that a dark-mode variant tends to produce unreadable hybrids.

const INK = "#0a0d0b";
const INK_3 = "#5c635e";
const LINE = "#e8e7e1";
const BG = "#fafaf7";
const SKY = "#1d6dc4";
const GREEN = "#1f6f3f";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function shell(title: string, inner: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
${inner}
<tr><td style="padding:20px 32px 28px;border-top:1px solid ${LINE};">
  <p style="margin:0;font:400 12px/1.6 ${FONT};color:${INK_3};">
    You're getting this because of a change to your Honua account. It isn't marketing, so it isn't affected by your email preferences.
  </p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function header(eyebrow: string, heading: string, accent: string) {
  return `<tr><td style="padding:36px 32px 0;">
  <p style="margin:0 0 10px;font:600 11px/1 ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:${accent};">${escapeHtml(eyebrow)}</p>
  <h1 style="margin:0;font:600 26px/1.25 ${FONT};color:${INK};letter-spacing:-0.02em;">${escapeHtml(heading)}</h1>
</td></tr>`;
}

const p = (html: string) =>
  `<tr><td style="padding:16px 32px 0;"><p style="margin:0;font:400 15px/1.65 ${FONT};color:${INK};">${html}</p></td></tr>`;

export function verificationApprovedEmail(opts: { name: string; handle: string; appUrl: string }) {
  const name = escapeHtml(opts.name);
  const handle = escapeHtml(opts.handle);
  const profileUrl = `${opts.appUrl}/profile/${encodeURIComponent(opts.handle)}`;

  const meansHtml = VERIFICATION_MEANS.map(
    (m) => `<tr><td style="padding:0 0 18px;">
      <p style="margin:0 0 4px;font:600 14px/1.4 ${FONT};color:${INK};">${escapeHtml(m.title)}</p>
      <p style="margin:0;font:400 14px/1.65 ${FONT};color:${INK_3};">${escapeHtml(m.body)}</p>
    </td></tr>`,
  ).join("");

  const html = shell(
    `You're verified on Honua, @${opts.handle}`,
    header("Verification approved", `Congratulations, ${name} — you're verified.`, SKY) +
      p(`Someone on the Honua team read your application and confirmed that <strong>@${handle}</strong> is who it says it is. The blue tick is on your profile now, and it will follow your name everywhere you appear on Honua.`) +
      `<tr><td style="padding:24px 32px 0;">
        <a href="${profileUrl}" style="display:inline-block;background:${GREEN};color:#ffffff;font:600 14px/1 ${FONT};text-decoration:none;padding:13px 22px;border-radius:10px;">See your profile →</a>
      </td></tr>` +
      `<tr><td style="padding:32px 32px 0;">
        <p style="margin:0 0 16px;font:600 11px/1 ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:${INK_3};">What the badge means</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${meansHtml}</table>
      </td></tr>` +
      p(`Thank you for the work you're logging here. It's the reason the badge is worth anything.`) +
      `<tr><td style="height:28px;"></td></tr>`,
  );

  const text = [
    `Congratulations, ${opts.name} — you're verified.`,
    ``,
    `Someone on the Honua team read your application and confirmed that @${opts.handle} is who it says it is. The blue tick is on your profile now, and it will follow your name everywhere you appear on Honua.`,
    ``,
    `See your profile: ${profileUrl}`,
    ``,
    `WHAT THE BADGE MEANS`,
    ...VERIFICATION_MEANS.flatMap((m) => [``, `${m.title}`, m.body]),
    ``,
    `Thank you for the work you're logging here. It's the reason the badge is worth anything.`,
  ].join("\n");

  return { subject: `You're verified on Honua, @${opts.handle}`, html, text };
}

export function verificationRejectedEmail(opts: { name: string; handle: string; reason: string; appUrl: string }) {
  const name = escapeHtml(opts.name);
  const reason = escapeHtml(opts.reason);

  const criteriaHtml = VERIFICATION_CRITERIA.map(
    (c) => `<li style="margin:0 0 8px;font:400 14px/1.6 ${FONT};color:${INK_3};">${escapeHtml(c)}</li>`,
  ).join("");

  const html = shell(
    "About your Honua verification request",
    header("Verification reviewed", `We couldn't verify your account yet, ${name}.`, INK_3) +
      p(`Someone read your application in full. Here's what they said:`) +
      `<tr><td style="padding:16px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};border:1px solid ${LINE};border-radius:12px;">
          <tr><td style="padding:16px 18px;"><p style="margin:0;font:400 14px/1.65 ${FONT};color:${INK};">${reason}</p></td></tr>
        </table>
      </td></tr>` +
      p(`This isn't a judgement about your account or your work — it means the reviewer couldn't confirm identity from what was in front of them. You're welcome to apply again once something below has changed.`) +
      `<tr><td style="padding:28px 32px 0;">
        <p style="margin:0 0 12px;font:600 11px/1 ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:${INK_3};">What reviewers look for</p>
        <ul style="margin:0;padding-left:20px;">${criteriaHtml}</ul>
      </td></tr>` +
      `<tr><td style="height:28px;"></td></tr>`,
  );

  const text = [
    `We couldn't verify your account yet, ${opts.name}.`,
    ``,
    `Someone read your application in full. Here's what they said:`,
    ``,
    opts.reason,
    ``,
    `This isn't a judgement about your account or your work — it means the reviewer couldn't confirm identity from what was in front of them. You're welcome to apply again once something below has changed.`,
    ``,
    `WHAT REVIEWERS LOOK FOR`,
    ...VERIFICATION_CRITERIA.map((c) => `- ${c}`),
  ].join("\n");

  return { subject: "About your Honua verification request", html, text };
}
