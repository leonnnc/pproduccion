import { createClient } from '@supabase/supabase-js';

// Intentar leer las variables de entorno de Vite o usar las credenciales públicas por defecto
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uufxxzrasmvwejbvqbvi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Znh4enJhc212d2VqYnZxYnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODk5NjYsImV4cCI6MjA5ODA2NTk2Nn0.a6moGjX5e3UYuqE4HWbSGjbg6gVDTzdAE8j1j8X7kMo';

// Verificar si las credenciales están configuradas
export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;
