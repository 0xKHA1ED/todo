import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function getSupabaseConfigError() {
  if (!supabaseUrl || supabaseUrl.includes('your-project-ref')) {
    return 'NEXT_PUBLIC_SUPABASE_URL is not configured.'
  }
  if (!supabaseAnonKey || supabaseAnonKey.includes('your-anon-key')) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.'
  }
  return null
}

export function getSupabaseClient() {
  const configError = getSupabaseConfigError()
  if (configError) {
    throw new Error(configError)
  }

  if (!client) {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return client
}
