import type { DocumentTemplate, RequestRecord, SchoolBranding } from './portalTypes';

const API_URL = import.meta.env.VITE_EDUCRM_API_URL || 'https://crm.esjt.com.br';

function getPortalToken() {
  return localStorage.getItem('portal_token') ?? '';
}

function withAuth(headers: Record<string, string> = {}) {
  const token = getPortalToken();
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Erro ao processar a solicitação.');
  }
  return payload;
}

export async function fetchSchoolBranding(): Promise<SchoolBranding> {
  const response = await fetch(`${API_URL}/api/portal-branding`);
  return parseJson<SchoolBranding>(response);
}

export async function fetchPortalDashboard(cpf: string): Promise<{
  branding: SchoolBranding;
  templates: DocumentTemplate[];
  requests: RequestRecord[];
}> {
  const response = await fetch(`${API_URL}/api/portal-dashboard`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ cpf }),
  });

  return parseJson(response);
}

export async function createPortalRequest(input: {
  cpf: string;
  studentName: string;
  contactId: number;
  templateId: number;
  channel?: string;
}): Promise<{ request: RequestRecord }> {
  const response = await fetch(`${API_URL}/api/portal-request`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });

  return parseJson(response);
}

export async function reportPortalIssue(input: {
  cpf: string;
  requestId: number;
  issueNotes: string;
}): Promise<{ success: true }> {
  const response = await fetch(`${API_URL}/api/portal-report-issue`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input),
  });

  return parseJson(response);
}

export async function validatePortalDocument(protocol: string): Promise<{ request: RequestRecord | null }> {
  const response = await fetch(`${API_URL}/api/portal-validate?protocol=${encodeURIComponent(protocol)}`);
  return parseJson(response);
}

export { API_URL, getPortalToken };
