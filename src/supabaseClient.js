import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Check that REACT_APP_SUPABASE_URL and ' +
    'REACT_APP_SUPABASE_ANON_KEY are set in .env.local (for local dev) and in your ' +
    'Vercel project\'s Environment Variables (for the deployed app).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
