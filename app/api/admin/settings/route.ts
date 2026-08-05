import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-role";
import { isMissingFunction, isMissingTable } from "@/lib/pg-errors";
import { logWarn, requestId, failure } from "@/lib/observability";
import { shapeSettings, toPatch } from "@/lib/platform";

// The platform switches (migration 044).
//
// GET    the current settings
// PATCH  { registrationOpen?, maintenanceMode?, ... , actorLabel? }
// POST   { action: 'clear_reports', actorLabel? }
//
// All three gated on `settings.manage`, which only an owner holds. That is a
// deliberately narrow list: maintenance mode takes the whole site down for
// everyone who is not in this console, and closing registration decides whether
// Honua accepts new members at all. Neither is a moderation decision.
//
// The settings screen used to be four booleans in React state — flipping one
// showed a toast and changed nothing, and a reload put it back. Every field
// this route writes now has a reader, named in lib/platform.ts. Anything that
// did not have one is not here.

export const runtime = 'nodejs';

const MISSING_MIGRATION = 'apply supabase/migrations/044_platform_settings.sql';

const str = (v: any, max = 200) => typeof v === 'string' ? v.trim().slice(0, max) : '';

export async function GET(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-settings', limit: 60, permission: 'settings.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const { data, error } = await ctx.db.rpc('admin_settings_get');

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        // Same posture as every other console panel one migration ahead of the
        // database: say the feature is not there rather than render a set of
        // permissive defaults that look like live settings.
        logWarn('admin/settings', 'settings unavailable', { fix: MISSING_MIGRATION, requestId: id });
        return NextResponse.json({ available: false, settings: null }, { headers: { 'Cache-Control': 'no-store' } });
      }
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      available: true,
      settings: shapeSettings(row),
      canManage: true,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return failure('admin/settings', err, id, 'Could not load the platform settings.');
  }
}

export async function PATCH(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-settings-write', limit: 40, permission: 'settings.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const { patch, error: invalid } = toPatch(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const { data, error } = await ctx.db.rpc('admin_settings_set', {
      p_actor: ctx.adminId,
      p_label: str(body?.actorLabel, 80) || null,
      p_patch: patch,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        return NextResponse.json({ error: `Platform settings are not set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 409 });
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ settings: shapeSettings(row) });
  } catch (err) {
    return failure('admin/settings', err, id, 'Could not save that setting.');
  }
}

export async function POST(req: NextRequest) {
  const { ctx, fail } = await requireAdmin(req, { name: 'admin-settings-write', limit: 40, permission: 'settings.manage' });
  if (fail) return fail;

  const id = requestId(req);
  try {
    const body = await req.json().catch(() => ({}));
    const action = str(body?.action, 40);

    if (action !== 'clear_reports') {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    const { data, error } = await ctx.db.rpc('admin_clear_reports', {
      p_actor: ctx.adminId,
      p_label: str(body?.actorLabel, 80) || null,
      p_note: str(body?.note, 400) || null,
    });

    if (error) {
      if (isMissingFunction(error) || isMissingTable(error)) {
        return NextResponse.json({ error: `That isn't set up yet — ${MISSING_MIGRATION}.` }, { status: 503 });
      }
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 409 });
      throw error;
    }

    // The number matters. "Reports cleared" over an empty queue is the toast
    // the old screen showed whether or not anything happened.
    const dismissed = Number(Array.isArray(data) ? data[0] : data) || 0;
    return NextResponse.json({ dismissed });
  } catch (err) {
    return failure('admin/settings', err, id, 'Could not clear the moderation queue.');
  }
}
