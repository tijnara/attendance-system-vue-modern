import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_KEY:', supabaseKey ? `[${supabaseKey.length} chars] ${supabaseKey.slice(0,4)}...${supabaseKey.slice(-4)}` : 'undefined or empty');

if (!supabaseKey) {
  throw new Error('VITE_SUPABASE_KEY is missing or empty!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
