// Custom Supabase client pointed at the user's own Supabase project.
// This bypasses the auto-managed Lovable Cloud client so the app can run
// against an external Supabase project (e.g. on Vercel).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://sbhgjftaypfsuhshoesq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YKEZGomlYl6TqllscX02UQ_zn1SIazq";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
