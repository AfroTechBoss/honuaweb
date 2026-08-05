// Transactional email, server-only.
//
// Talks to Resend's REST API over plain fetch rather than pulling in their SDK
// — one endpoint, one POST, no dependency to keep current.
//
// Sending is best-effort by design. Every caller so far is a side effect of
// something more important that already succeeded (an account was verified, a
// decision was recorded), so a missing API key or a provider outage returns a
// reason instead of throwing and undoing that work.
//
// Environment:
//   RESEND_API_KEY — required to actually send. Unset, this no-ops loudly.
//   EMAIL_FROM     — "Honua <hello@yourdomain>", on a domain verified with
//                    Resend. Falls back to Resend's shared sandbox sender,
//                    which only delivers to the Resend account's own address.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Where replies land. EMAIL_FROM is a sending identity, not an inbox — it lives
// on a send-only subdomain so transactional reputation stays off the main
// domain's human mail. But a rejection email is exactly the message someone
// replies to, so every send points Reply-To at the support address the support
// page already publishes. Without this, "why was I rejected?" goes nowhere.
export const SUPPORT_EMAIL = "support@honua.green";

export type SendResult = { sent: boolean; error?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY is not set — "${opts.subject}" to ${opts.to} was not sent.`);
    return { sent: false, error: "Email isn't configured on the server (RESEND_API_KEY)" };
  }
  if (!opts.to) return { sent: false, error: "No email address on file for this account" };

  const from = process.env.EMAIL_FROM || "Honua <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const reason = payload?.message || payload?.error || `Resend returned ${res.status}`;
      console.error("[email] send failed:", reason);
      return { sent: false, error: reason };
    }
    return { sent: true };
  } catch (e: any) {
    console.error("[email] send failed:", e?.message);
    return { sent: false, error: e?.message || "Could not reach the email provider" };
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
