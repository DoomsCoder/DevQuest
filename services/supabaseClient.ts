
import { createClient } from '@supabase/supabase-js';

// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Persistence will be disabled.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Service generic helper to check connection
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
    try {
        const { error } = await supabase.from('users_profile').select('count', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        return false;
    }
};
