import { createClient } from '@supabase/supabase-js';

// No mundo real, essas variáveis viriam do .env
// Substitua pelas chaves reais do seu projeto EduCRM no Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
