// The seller's own tax details row (migration 058). Browser-only — the shared
// lists and validation live in lib/tax.ts, which the admin route also imports.

import { supabase } from "@/lib/supabase";
import { validateTaxProfile, cleanTaxProfile, type TaxProfile } from "@/lib/tax";

// Read and written straight from the browser: 058's RLS scopes it to the owner,
// and its trigger resets the review status on every save, so there is nothing a
// server route would add.

export async function getMyTaxProfile(userId: string): Promise<{ profile: TaxProfile | null; available: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('seller_tax_profiles').select('*').eq('seller_id', userId).maybeSingle();
    if (error) {
      // 058 not applied. The form says so rather than offering to save into nothing.
      if (error.code === '42P01' || error.code === 'PGRST205') return { profile: null, available: false };
      return { profile: null, available: true, error: error.message };
    }
    return { profile: (data as TaxProfile) ?? null, available: true };
  } catch {
    return { profile: null, available: true, error: 'Could not reach the server.' };
  }
}

export async function saveMyTaxProfile(userId: string, draft: TaxProfile): Promise<{ profile?: TaxProfile; error?: string }> {
  const invalid = validateTaxProfile(draft);
  if (invalid) return { error: invalid };
  try {
    const { data, error } = await supabase
      .from('seller_tax_profiles')
      .upsert({ seller_id: userId, ...cleanTaxProfile(draft) }, { onConflict: 'seller_id' })
      .select('*').single();
    if (error) {
      if (error.code === '23514') return { error: 'Some details are missing. Check your name, address and TIN.' };
      if (error.code === '42501') return { error: 'Your account is restricted, so tax details can’t be changed right now.' };
      return { error: error.message };
    }
    return { profile: data as TaxProfile };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
