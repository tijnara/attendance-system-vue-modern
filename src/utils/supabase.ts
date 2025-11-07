import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qqczvucpzbedcxjdxppo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxY3p2dWNwemJlZGN4amR4cHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0ODUyMTMsImV4cCI6MjA3ODA2MTIxM30.Viqb7eUPHgQcR92ziNNJ7mYQW2pKNFN-DsdH8DAFbuI'
);

export { supabase };
