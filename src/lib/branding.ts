import { supabase } from './supabase';
import type { SchoolBranding } from './portalTypes';

export const DEFAULT_SCHOOL_BRANDING: SchoolBranding = {
  nome: 'Educandário São Judas Tadeu',
  logo: null,
};

export async function loadSchoolBranding(): Promise<SchoolBranding> {
  const { data } = await supabase
    .from('school_settings')
    .select('nome, logo')
    .eq('id', 1)
    .single();

  if (!data) return DEFAULT_SCHOOL_BRANDING;

  return {
    nome: data.nome || DEFAULT_SCHOOL_BRANDING.nome,
    logo: data.logo || null,
  };
}
