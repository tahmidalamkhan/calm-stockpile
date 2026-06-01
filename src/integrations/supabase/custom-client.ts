// External Supabase client.
// Publishable keys are safe to embed in client code.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://sbhgjftaypfsuhshoesq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YKEZGomlYl6TqllscX02UQ_zn1SIazq";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
