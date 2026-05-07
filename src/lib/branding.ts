import { fetchSchoolBranding } from './api';
import type { SchoolBranding } from './portalTypes';

export const DEFAULT_SCHOOL_BRANDING: SchoolBranding = {
  nome: 'Educandário São Judas Tadeu',
  logo: null,
};

export async function loadSchoolBranding(): Promise<SchoolBranding> {
  try {
    return await fetchSchoolBranding();
  } catch {
    return DEFAULT_SCHOOL_BRANDING;
  }
}
