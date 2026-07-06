import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('[SUPABASE CLIENT INIT]');
console.log(' - NEXT_PUBLIC_SUPABASE_URL defined:', Boolean(supabaseUrl));
console.log(' - NEXT_PUBLIC_SUPABASE_ANON_KEY defined:', Boolean(supabaseAnonKey));

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create a single supabase client for interacting with your database.
// Auth options ensure session is persisted in localStorage and OAuth redirects
// are automatically detected and handled on page load.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
