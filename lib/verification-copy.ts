// The one place the badge is explained. The applicant reads this before
// applying, the approval email repeats it, and the panel behind a profile's
// tick shows it — three surfaces, one wording, so the promise can't drift.
//
// Everything below describes what the badge actually does today. It is
// deliberately free of perks the product doesn't implement: a claim like
// "verified posts rank higher" would be the easiest sentence to write here and
// the fastest way to make the badge mean nothing.

export const VERIFICATION_MEANS: { title: string; body: string }[] = [
  {
    title: "It confirms identity, not merit",
    body:
      "The tick says Honua checked that this account belongs to the person, organization, or project it names. " +
      "It is not a score, a ranking, or an endorsement of anything the account posts.",
  },
  {
    title: "It travels with the account, not the name",
    body:
      "Changing your username keeps the badge, and the rename is recorded on your profile. " +
      "The old username goes back into circulation — whoever claims it does not inherit the tick.",
  },
  {
    title: "It can be taken back",
    body:
      "If an account changes hands, starts misrepresenting who it is, or reports impact it can't stand behind, " +
      "the badge is removed. Verification is a statement about the account as it is now.",
  },
];

// What a reviewer is actually looking for. Published so applying isn't a
// guessing game, and so a rejection can point at a line someone can act on.
export const VERIFICATION_CRITERIA: string[] = [
  "The profile is filled in — a real name, a picture, and a bio that says what you do.",
  "Your identity can be corroborated somewhere off Honua: a website, an organization page, a press mention, a registry entry.",
  "Your impact ledger has real, vouched actions behind it rather than unvouched claims.",
  "The account has no unresolved moderation history.",
];

export const VERIFICATION_IS_NOT: string[] = [
  "It cannot be bought.",
  "It is not a reward for follower count.",
  "It is not permanent.",
];

// Shown to an applicant while a review is open, so "how long?" has an answer
// that doesn't require asking.
export const VERIFICATION_SLA = "Most applications are reviewed within a week.";
