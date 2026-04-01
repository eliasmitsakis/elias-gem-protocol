import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('[SUPABASE CLIENT INIT]');
console.log(' - NEXT_PUBLIC_SUPABASE_URL defined:', Boolean(supabaseUrl));
console.log(' - NEXT_PUBLIC_SUPABASE_ANON_KEY defined:', Boolean(supabaseAnonKey));

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create a single supabase client for interacting with your database
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
