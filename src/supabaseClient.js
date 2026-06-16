import { createClient } from '@supabase/supabase-js';

// Reemplazá esto con tus datos reales de Supabase API
const supabaseUrl = 'https://vrcmlxupgydmblnrcmwz.supabase.co';
const supabaseAnonKey = 'sb_publishable_oORDoUTMjDG8vfC3I5JzrQ_ypjj2Hz_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);