import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Handles both:
// 1. token_hash flow: Supabase email templates send ?token_hash=...&type=recovery
// 2. PKCE code flow: fallback if Supabase redirected here with ?code=...
//
// This route is the redirect target for password-reset emails. Supabase's email
// template generates a link like:
//   {SUPABASE_URL}/auth/v1/verify?token=...&type=recovery&redirect_to={this_url}
// When clicked, Supabase verifies and redirects here with either token_hash or code.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  // For recovery always go to reset-password; for other types use ?next= or home
  const next = searchParams.get('next') ?? (type === 'recovery' ? '/reset-password' : '/');

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  // PKCE code flow (Supabase appended ?code= to our redirectTo)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // token_hash flow (Supabase email template's {{ .ConfirmationURL }})
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?auth_error=confirm`);
}
