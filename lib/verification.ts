import { supabase } from "./supabase";

// Applicant's half of verification. Reviewers work through
// /api/admin/verification instead (see lib/admin-verification.ts) — the admin
// console signs in with Privy, so it has no Supabase session to read this
// table with.

export type VerificationStatus = "pending" | "approved" | "rejected";

export type VerificationRequest = {
  id: string;
  user_id: string;
  status: VerificationStatus;
  category: string | null;
  real_name: string | null;
  links: string | null;
  note: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const VERIFICATION_CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: "individual", label: "Individual", hint: "You, under your own name" },
  { value: "organization", label: "Organization", hint: "An NGO, charity, or institution" },
  { value: "project", label: "Project", hint: "A named initiative or campaign" },
  { value: "business", label: "Business", hint: "A company or registered seller" },
];

// Only the most recent application matters: a rejected one is history the
// moment a new one is opened, and the unique index in migration 030 means
// there is never more than one pending.
export async function getMyVerificationRequest(userId: string): Promise<VerificationRequest | null> {
  const { data, error } = await supabase
    .from("verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  // A missing table means migration 030 hasn't been applied. Treat it as "no
  // application" rather than breaking the settings page around it.
  if (error) return null;
  return (data?.[0] as VerificationRequest) ?? null;
}

export type VerificationFields = {
  category: string;
  real_name: string;
  links: string;
  note: string;
};

export async function submitVerificationRequest(userId: string, f: VerificationFields) {
  const { data, error } = await supabase
    .from("verification_requests")
    .insert({
      user_id: userId,
      status: "pending",
      category: f.category,
      real_name: f.real_name.trim() || null,
      links: f.links.trim() || null,
      note: f.note.trim() || null,
    })
    .select()
    .single();
  if (error) {
    // The partial unique index, hit when two tabs submit at once.
    if (error.code === "23505") throw new Error("You already have an application under review.");
    if (error.code === "42P01") throw new Error("Verification isn't switched on yet — migration 030 hasn't been applied.");
    throw error;
  }
  return data as VerificationRequest;
}
