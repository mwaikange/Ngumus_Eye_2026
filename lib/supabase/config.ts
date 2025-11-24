// TODO: Move these to proper environment variables in Vercel project settings
export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://supabase-yellow-ngumu-eye.vercel.app",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
}
