export type LoginStep = 'CPF' | 'CODE';

export interface SchoolBranding {
  nome: string;
  logo: string | null;
}

export interface Contact {
  id: number;
  cpf: string;
  phone: string | null;
  student_name: string;
  parent_name: string | null;
  mother_name: string | null;
  father_name: string | null;
  grade: string | null;
  shift: string | null;
  horario: string | null;
  activesoft_aluno_id: string | null;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  slug: string;
  type: 'manual' | 'automatico' | string;
  active: boolean;
  estimated_days: number;
}

export interface RequestRecord {
  id: number;
  protocol: string;
  requester_cpf: string;
  student_name: string;
  document_name: string;
  status: string;
  result_url: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}
