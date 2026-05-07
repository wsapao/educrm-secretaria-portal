import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogOut, BookOpen, User, FileText, Send, Shield, Clock, Headphones } from 'lucide-react';
import { DEFAULT_SCHOOL_BRANDING, loadSchoolBranding } from '../lib/branding';
import type { Contact, DocumentTemplate, RequestRecord, SchoolBranding } from '../lib/portalTypes';
import { SelectionCard } from '../components/SelectionCard';
import { PedidoItem } from '../components/PedidoItem';

const WHATSAPP_NUMBER = '5500000000000'; // substituir pelo número real da secretaria

function readStoredContacts(): Contact[] {
  try {
    return JSON.parse(localStorage.getItem('portal_contacts') ?? '[]') as Contact[];
  } catch {
    return [];
  }
}

async function loadDashboardData(requesterCpf: string) {
  const [{ data: templateData }, { data: requestData }] = await Promise.all([
    supabase.from('document_templates').select('*').eq('active', true),
    supabase
      .from('requests')
      .select('*')
      .eq('requester_cpf', requesterCpf)
      .order('created_at', { ascending: false }),
  ]);
  return {
    templates: (templateData ?? []) as DocumentTemplate[],
    requests: (requestData ?? []) as RequestRecord[],
  };
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

  const cpf = localStorage.getItem('portal_cpf') ?? '';

  useEffect(() => {
    if (!cpf) { navigate('/'); return; }
    let ignore = false;
    void Promise.all([loadDashboardData(cpf), loadSchoolBranding()]).then(([data, branding]) => {
      if (ignore) return;
      setTemplates(data.templates);
      setRequests(data.requests);
      setSchoolBranding(branding);
    });
    return () => { ignore = true; };
  }, [cpf, navigate]);

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const handleRequest = async () => {
    if (!selectedStudent || !selectedTemplate) return alert('Selecione aluno e documento');
    setLoading(true);
    try {
      const student = contacts.find(c => c.id.toString() === selectedStudent);
      const template = templates.find(t => t.id.toString() === selectedTemplate);
      if (!student || !template || !cpf) throw new Error('Dados incompletos.');

      if (template.type === 'manual') {
        const protocol = `SEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('requests').insert([{
          protocol, requester_cpf: cpf, student_name: student.student_name,
          contact_id: student.id, template_id: template.id, document_name: template.name, channel: 'portal',
        }]);
        alert(`Protocolo ${protocol} gerado com sucesso!`);
      } else {
        const API_URL = import.meta.env.VITE_EDUCRM_API_URL || 'https://crm.esjt.com.br';
        const protocol = `SEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: reqData } = await supabase.from('requests').insert([{
          protocol, requester_cpf: cpf, student_name: student.student_name, contact_id: student.id,
          template_id: template.id, document_name: template.name, channel: 'portal', status: 'Em produção',
        }]).select().single();

        const shiftToHorario: Record<string, string> = {
          'Manhã': '07:30h às 11:30h', 'Tarde': '13:00h às 17:00h', 'Integral': '07:30h às 17:00h',
        };
        const horario = student.horario || (student.shift ? shiftToHorario[student.shift] : '') || '';

        await fetch(`${API_URL}/api/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: reqData?.id, protocol, cpfResponsavel: cpf,
            alunoId: student.activesoft_aluno_id, studentName: student.student_name,
            parentName: student.parent_name, motherName: student.mother_name,
            fatherName: student.father_name, serie: student.grade, horario,
            anoLetivo: new Date().getFullYear().toString(),
            templateSlug: template.slug, templateName: template.name,
          }),
        });
        alert('Documento gerado com sucesso!');
      }
      const data = await loadDashboardData(cpf);
      setTemplates(data.templates);
      setRequests(data.requests);
    } catch {
      alert('Erro ao solicitar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!issueNotes.trim()) return alert('Por favor, descreva o problema.');
    setLoading(true);
    try {
      const req = requests.find(r => r.id === reportingIssueId);
      const newNotes = req?.notes
        ? `${req.notes}\n---\nProblema relatado pelo Pai: ${issueNotes}`
        : `Problema relatado pelo Pai: ${issueNotes}`;
      await supabase.from('requests').update({ status: 'Em análise', notes: newNotes }).eq('id', reportingIssueId);
      alert('Sua solicitação de revisão foi enviada!');
      setReportingIssueId(null);
      setIssueNotes('');
      const data = await loadDashboardData(cpf);
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
              {requests.slice(0, 5).map(req => (
                <PedidoItem
                  key={req.id}
                  req={req}
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
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Precisa de ajuda?</p>
              <p className="text-xs text-slate-500">Fale com a secretaria diretamente</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#25d366] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1ebe5d]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Falar no WhatsApp
          </a>
        </div>

      </main>
    </div>
  );
}
