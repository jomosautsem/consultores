import { createClient } from '@supabase/supabase-js';

// IMPORTANT: These values should be stored in environment variables, not hardcoded.
// For example, in a Vite project, you would use import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = "https://rlfzkijuxgjdtfxthhru.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZnpraWp1eGdqZHRmeHRoaHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTYzNzIsImV4cCI6MjA3ODM5MjM3Mn0.XSClMJTXPHNancBlGDN1nFcNN9AKX5u4fIghkE3gyMM";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
