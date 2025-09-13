import { createClient } from "@supabase/supabase-js";

export const siteUrl =
  (import.meta as any).env?.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (process.env as any).REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
