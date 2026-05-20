import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, User, FileText, Send, Shield, Clock } from 'lucide-react';
import { DEFAULT_SCHOOL_BRANDING, loadSchoolBranding } from '../lib/branding';
import type { Contact, DocumentTemplate, RequestRecord, SchoolBranding } from '../lib/portalTypes';
import { SelectionCard } from '../components/SelectionCard';
import { PedidoItem } from '../components/PedidoItem';
import {
  API_URL,
  createPortalRequest,
  getPortalToken,
  fetchPortalDashboard,
  reportPortalIssue,
} from '../lib/api';

const READY_STATUSES = ['Pronto para download/retirada', 'Finalizado'] as const;
const PRODUCTION_STATUS = 'Em produção';

function readStoredContacts(): Contact[] {
  try {
    return JSON.parse(localStorage.getItem('portal_contacts') ?? '[]') as Contact[];
  } catch {
    return [];
  }
}

async function loadDashboardData(requesterCpf: string) {
  const data = await fetchPortalDashboard(requesterCpf);
  return {
    templates: data.templates,
    requests: data.requests,
  };
}

function isRequestReady(status: string) {
  return READY_STATUSES.includes(status as (typeof READY_STATUSES)[number]);
}

function getRequestSuccessMessage(request: RequestRecord | null) {
  if (request && isRequestReady(request.status) && request.result_url) {
    return 'Documento gerado com sucesso! O PDF já está disponível no histórico.';
  }

  return 'Solicitação enviada com sucesso! O documento aparecerá no histórico assim que ficar pronto.';
}

async function waitForRequestAvailability(requestId: number, attempts = 6, intervalMs = 1500) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const dashboard = await fetchPortalDashboard(localStorage.getItem('portal_cpf') ?? '');
    const request = dashboard.requests.find((item) => item.id === requestId) ?? null;
    if (request && (isRequestReady(request.status) || Boolean(request.result_url))) {
      return request;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }

  return null;
}

async function parseApiError(response: Response) {
  const fallback = 'Não foi possível gerar o documento agora.';
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error ?? payload.message ?? fallback;
  }

  const text = (await response.text()).trim();
  return text || fallback;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function StepIcon({ done, active, num }: { done: boolean; active: boolean; num: number }) {
  if (done) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (active) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-white">
        <span className="text-sm font-bold text-primary">{num}</span>
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100">
      <span className="text-sm font-bold text-slate-400">{num}</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [contacts] = useState<Contact[]>(() => readStoredContacts());
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedStudent, setSelectedStudent] = useState(() => readStoredContacts()[0]?.id.toString() ?? '');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportingIssueId, setReportingIssueId] = useState<number | null>(null);
  const [issueNotes, setIssueNotes] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(DEFAULT_SCHOOL_BRANDING);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [newRequestId, setNewRequestId] = useState<number | null>(null);

  const cpf = localStorage.getItem('portal_cpf') ?? '';
  const portalToken = getPortalToken();

  const fetchDashboardState = async (requesterCpf: string) => {
    const [data, branding] = await Promise.all([loadDashboardData(requesterCpf), loadSchoolBranding()]);
    return { data, branding };
  };

  useEffect(() => {
    if (!cpf) { navigate('/'); return; }
    let ignore = false;
    void fetchDashboardState(cpf)
      .then(({ data, branding }) => {
        if (ignore) return;
        setTemplates(data.templates);
        setRequests(data.requests);
        setSchoolBranding(branding);
        setInitialLoading(false);
      })
      .catch((error) => {
        if (ignore) return;
        setLoadError(getErrorMessage(error, 'Não foi possível carregar os documentos disponíveis agora.'));
        setInitialLoading(false);
      });
    return () => { ignore = true; };
  }, [cpf, navigate]);

  useEffect(() => {
    if (!cpf || !requests.some((request) => request.status === PRODUCTION_STATUS)) return;

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      void loadDashboardData(cpf)
        .then((data) => {
          if (cancelled) return;
          setRequests(data.requests);
        })
        .catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [cpf, requests]);

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const handleRequest = async () => {
    if (!selectedStudent || !selectedTemplate) return alert('Selecione aluno e documento');
    setLoading(true);
    try {
      const student = contacts.find(c => c.id.toString() === selectedStudent);
      const template = templates.find(t => t.id.toString() === selectedTemplate);
      if (!student || !template || !cpf) throw new Error('Dados incompletos.');

      const { request: reqData } = await createPortalRequest({
        cpf,
        studentName: student.student_name,
        contactId: student.id,
        templateId: template.id,
        channel: 'portal',
      });

      if (template.type === 'manual') {
        alert(`Protocolo ${reqData.protocol} gerado com sucesso!`);
      } else {
        const shiftToHorario: Record<string, string> = {
          'Manhã': '07:30h às 11:30h', 'Tarde': '13:00h às 17:00h', 'Integral': '07:30h às 17:00h',
        };
        const horario = student.horario || (student.shift ? shiftToHorario[student.shift] : '') || '';

        const response = await fetch(`${API_URL}/api/generate-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(portalToken ? { Authorization: `Bearer ${portalToken}` } : {}),
          },
          body: JSON.stringify({
            requestId: reqData.id, protocol: reqData.protocol, cpfResponsavel: cpf,
            alunoId: student.activesoft_aluno_id, studentName: student.student_name,
            parentName: student.parent_name, motherName: student.mother_name,
            fatherName: student.father_name, serie: student.grade, horario,
            anoLetivo: new Date().getFullYear().toString(),
            templateSlug: template.slug, templateName: template.name,
          }),
        });

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const readyRequest = reqData.id
          ? await waitForRequestAvailability(reqData.id)
          : null;

        alert(getRequestSuccessMessage(readyRequest));
      }
      setNewRequestId(reqData.id);
      setSelectedTemplate('');
      setSelectedStudent(contacts[0]?.id.toString() ?? '');
      
      const data = await loadDashboardData(cpf);
      setLoadError('');
      setTemplates(data.templates);
      setRequests(data.requests);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao solicitar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!issueNotes.trim()) return alert('Por favor, descreva o problema.');
    setLoading(true);
    try {
      await reportPortalIssue({
        cpf,
        requestId: reportingIssueId as number,
        issueNotes,
      });
      alert('Sua solicitação de revisão foi enviada!');
      setReportingIssueId(null);
      setIssueNotes('');
      const data = await loadDashboardData(cpf);
      setLoadError('');
      setTemplates(data.templates);
      setRequests(data.requests);
    } catch {
      alert('Erro ao relatar problema.');
    } finally {
      setLoading(false);
    }
  };

  const activeStudent = contacts.find(c => c.id.toString() === selectedStudent);
  const activeTemplate = templates.find(t => t.id.toString() === selectedTemplate);
  const step1Done = !!activeStudent;
  const step2Done = !!activeTemplate;
  const parentFullName = contacts[0]?.parent_name ?? contacts[0]?.mother_name ?? null;
  const parentFirstName = parentFullName ? parentFullName.trim().split(' ')[0] : 'responsável';
  const parentInitial = parentFirstName[0].toUpperCase();

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          {schoolBranding.logo ? (
            <img
              src={schoolBranding.logo}
              alt={schoolBranding.nome}
              className="max-h-10 max-w-[132px] object-contain"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-school-red shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold leading-none text-primary">Secretaria Digital</p>
            <p className="text-[11px] text-slate-400">{schoolBranding.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-slate-50 py-1.5 pl-1.5 pr-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-primary text-xs font-bold text-white">
              {parentInitial}
            </div>
            <span className="text-sm font-medium text-slate-700">Olá, {parentFirstName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ── Hero + Stepper ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold leading-tight text-slate-800">
              Peça seu documento<br />
              <span className="text-school-red">em 3 passos</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">Simples, rápido e seguro.</p>
          </div>
          <div className="flex items-start gap-1 pt-1">
            <div className="flex flex-col items-center gap-1">
              <StepIcon done={step1Done} active={!step1Done} num={1} />
              <span className={`max-w-[72px] text-center text-[10px] font-semibold leading-tight ${step1Done ? 'text-primary' : 'text-slate-400'}`}>
                Escolha o aluno
              </span>
            </div>
            <div className={`mt-5 h-0.5 w-8 ${step1Done ? 'bg-primary' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center gap-1">
              <StepIcon done={step2Done} active={step1Done && !step2Done} num={2} />
              <span className={`max-w-[72px] text-center text-[10px] font-semibold leading-tight ${step2Done ? 'text-primary' : 'text-slate-400'}`}>
                Escolha o documento
              </span>
            </div>
            <div className={`mt-5 h-0.5 w-8 ${step2Done ? 'bg-primary' : 'bg-slate-200'}`} />
            <div className="flex flex-col items-center gap-1">
              <StepIcon done={false} active={step1Done && step2Done} num={3} />
              <span className={`max-w-[72px] text-center text-[10px] font-semibold leading-tight ${step1Done && step2Done ? 'text-primary' : 'text-slate-400'}`}>
                Confirme e solicite
              </span>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => {
                  setInitialLoading(true);
                  setLoadError('');
                  void fetchDashboardState(cpf)
                    .then(({ data, branding }) => {
                      setTemplates(data.templates);
                      setRequests(data.requests);
                      setSchoolBranding(branding);
                      setInitialLoading(false);
                    })
                    .catch((error) => {
                      setLoadError(getErrorMessage(error, 'Não foi possível carregar os documentos disponíveis agora.'));
                      setInitialLoading(false);
                    });
                }}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Nova Solicitação ── */}
        <div className="mb-5 rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-50 px-6 py-4">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-slate-800">Nova solicitação</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Aluno */}
              <div className="relative">
                <SelectionCard
                  iconBg="bg-blue-50"
                  icon={<User className="h-6 w-6 text-blue-600" />}
                  label="Aluno"
                  name={activeStudent?.student_name ?? 'Selecione um aluno'}
                  sub={activeStudent?.grade ? `Série: ${activeStudent.grade}` : '—'}
                  onClick={() => {
                    if (contacts.length > 1) {
                      setShowStudentPicker(p => !p);
                      setShowTemplatePicker(false);
                    }
                  }}
                />
                {showStudentPicker && (
                  <ul className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                    {contacts.map(c => (
                      <li key={c.id}>
                        <button
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-blue-50"
                          onClick={() => { setSelectedStudent(c.id.toString()); setShowStudentPicker(false); }}
                        >
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{c.student_name}</span>
                          {c.grade && <span className="ml-auto text-xs text-slate-400">{c.grade}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Documento */}
              <div className="relative">
                <SelectionCard
                  iconBg="bg-amber-50"
                  icon={<FileText className="h-6 w-6 text-amber-600" />}
                  label="Documento"
                  name={activeTemplate?.name ?? 'Selecione um documento'}
                  sub={activeTemplate
                    ? activeTemplate.estimated_days > 0
                      ? `Prazo: ${activeTemplate.estimated_days} dias`
                      : 'Entrega imediata'
                    : '—'}
                  onClick={() => { setShowTemplatePicker(p => !p); setShowStudentPicker(false); }}
                />
                {showTemplatePicker && (
                  <ul className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                    {templates.map(t => (
                      <li key={t.id}>
                        <button
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-amber-50"
                          onClick={() => { setSelectedTemplate(t.id.toString()); setShowTemplatePicker(false); }}
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{t.name}</span>
                          <span className="ml-auto text-xs text-slate-400">
                            {t.estimated_days > 0 ? `${t.estimated_days}d` : 'Imediato'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {!initialLoading && templates.length === 0 ? (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Nenhum documento está disponível para solicitação no momento. Se isso persistir, fale com a secretaria.
              </div>
            ) : null}

            <div className="mt-5 flex flex-col items-end gap-2">
              <button
                onClick={handleRequest}
                disabled={loading || !selectedTemplate || !selectedStudent}
                className="flex items-center gap-2.5 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Processando...' : 'Solicitar documento'}
              </button>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Shield className="h-3 w-3" /> Seus dados estão protegidos
              </p>
            </div>
          </div>
        </div>

        {/* ── Últimos Pedidos ── */}
        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Clock className="h-4 w-4 text-primary" /> Últimos pedidos
            </h3>
            <button
              onClick={() => navigate('/historico')}
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Ver todos <span className="text-base leading-none">›</span>
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
              Nenhuma solicitação encontrada.
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              {requests.slice(0, 5).map((req, index) => (
                <PedidoItem
                  key={req.id}
                  req={req}
                  isNew={req.id === newRequestId || index === 0}
                  isReporting={reportingIssueId === req.id}
                  issueNotes={issueNotes}
                  loading={loading}
                  onReport={() => setReportingIssueId(req.id)}
                  onCancelReport={() => { setReportingIssueId(null); setIssueNotes(''); }}
                  onIssueNotesChange={setIssueNotes}
                  onSubmitIssue={handleReportIssue}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ── Ajuda ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#015EDB]/10">
              <svg className="h-6 w-6 text-[#015EDB]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.84 1.48 5.35 3.8 6.97L4.5 22l4.47-2.3c.96.2 1.96.3 3.03.3 5.52 0 10-4.03 10-9s-4.48-9-10-9z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Precisa de ajuda?</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-[280px] leading-relaxed">
                Fale pelo <strong className="text-[#015EDB]">ClassApp</strong>, é o nosso canal de comunicação oficial da escola.
              </p>
            </div>
          </div>
          <a
            href="#"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#015EDB] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#015EDB]/20 transition-all hover:-translate-y-0.5 hover:bg-[#014eb5] hover:shadow-lg"
          >
            Falar no ClassApp
          </a>
        </div>

      </main>
    </div>
  );
}
