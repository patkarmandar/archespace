/**
 * supabase.js — Supabase client singleton.
 *
 * Reads the project URL and anonymous API key from Vite
 * environment variables (prefixed VITE_ so they are exposed
 * to the client bundle). These must be set in a `.env` file
 * at the project root (see `.env.example`).
 *
 * The returned `supabase` instance is shared across the entire
 * app — never create a second client.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
