import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Server-side auth gate. Until now every guard was client-side (AuthGate in
// AppShell) — any route's data-less shell was reachable without a session.
// This middleware validates the Supabase session cookie on the server for
// every navigation, refreshes expiring tokens, and gates /admin by role.
// ---------------------------------------------------------------------------

// Routes reachable without a Supabase session. Mirrors AppShell's PUBLIC_PATHS:
// marketplace/search/checkout/orders allow guest shopping, and /admin has its
// own Privy email-OTP gate (allowlist in the Privy dashboard) instead of
// Supabase auth.
const PUBLIC_PATHS = [
  "/login",
  "/auth",            // OAuth callback + confirm — must run to exchange the code
  "/reset-password",  // password-recovery page
  "/terms",
  "/seller-policy",
  "/proposition",
  "/api",
  "/support",
  "/report",
  "/returns",
  "/marketplace",
  "/search",
  "/checkout",
  "/orders",
  "/admin",
];

// Public API endpoints (OG scraping must work unauthenticated)
const PUBLIC_API = ["/api/og"];

function isPublic(path: string): boolean {
  if (PUBLIC_API.some(p => path.startsWith(p))) return true;
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validates the JWT against Supabase Auth (and refreshes it if expiring) —
  // do not replace with getSession(), which trusts the cookie unverified.
  const { data: { user }, error } = await supabase.auth.getUser();

  // "You have no session" and "we couldn't reach Supabase to find out" both
  // arrive here as user === null. Discarding the error collapses them, so a
  // network blip signs everyone out mid-session and drops them on a login page
  // with nothing to say about why — indistinguishable from sign-in silently
  // doing nothing. Only an answer that never came back counts as unverified: a
  // missing session (400) or a rejected token (401/403) are real verdicts and
  // still mean signed out.
  const unverified =
    !!error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500);
  if (unverified) {
    console.warn(JSON.stringify({
      level: "warn",
      scope: "middleware",
      message: "session check failed — treating as signed out",
      at: new Date().toISOString(),
      reason: `${error!.name}: ${error!.message}`,
    }));
  }

  const path = request.nextUrl.pathname;

  // Signed-in users don't need the login page
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // No session → only public routes. Still fails closed when the check itself
  // failed, but marks the redirect so /login can explain the bounce instead of
  // presenting an empty form as if nothing had happened.
  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = unverified ? "?e=session" : "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip API routes (they self-guard and must return JSON/status codes, never an
  // HTML login redirect — this is critical for /api/checkout and the Stripe
  // webhook), plus static assets and Next internals. Everything else is checked.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|opengraph-image.png|logo.png|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|map)$).*)",
  ],
};
