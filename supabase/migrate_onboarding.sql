-- Add onboarding_complete column to profiles
-- Existing users are already onboarded; new OAuth users start at false
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Mark all existing users as complete so the wizard doesn't fire for them
UPDATE public.profiles SET onboarding_complete = true;
