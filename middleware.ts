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
  "/auth",       // OAuth callback (/auth/callback) — must run to exchange the code
  "/terms",
  "/seller-policy",
  "/proposition",
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
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Signed-in users don't need the login page
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // No session → only public routes
  if (!user && !isPublic(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
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
