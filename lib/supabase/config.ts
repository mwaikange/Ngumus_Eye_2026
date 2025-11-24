export const SUPABASE_CONFIG = {
  url:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://yellow-ngumu-eye-dev-3m3wzz.supabase.co",
  anonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbGxvdy1uZ3VtdS1leWUtZGV2LTNtM3d6eiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzMyNzY3MzcxLCJleHAiOjIwNDgzNDMzNzF9.KY3vI0SvEuEp7TqPZV5rfXIZvx7UQLrVRX0jGFYF7Jw",
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey)
}
