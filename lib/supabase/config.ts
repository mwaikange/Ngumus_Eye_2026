export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey)
}
