import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, LogOut } from 'lucide-react';
import { PedidoItem } from '../components/PedidoItem';
import { DEFAULT_SCHOOL_BRANDING, loadSchoolBranding } from '../lib/branding';
import type { RequestRecord, SchoolBranding } from '../lib/portalTypes';
import { fetchPortalDashboard, reportPortalIssue } from '../lib/api';

const PRODUCTION_STATUS = 'Em produção';

async function loadRequests(requesterCpf: string) {
  const data = await fetchPortalDashboard(requesterCpf);
  return data.requests;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function Historico() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingIssueId, setReportingIssueId] = useState<number | null>(null);
  const [issueNotes, setIssueNotes] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [schoolBranding, setSchoolBranding] = useState<SchoolBranding>(DEFAULT_SCHOOL_BRANDING);
  const [loadError, setLoadError] = useState('');

  const cpf = localStorage.getItem('portal_cpf') ?? '';

  const fetchHistoryState = async (requesterCpf: string) => {
    const [requestData, branding] = await Promise.all([loadRequests(requesterCpf), loadSchoolBranding()]);
    return { requestData, branding };
  };

  useEffect(() => {
    if (!cpf) {
      navigate('/');
      return;
    }

    let ignore = false;

    setLoading(true);
    setLoadError('');
    void fetchHistoryState(cpf)
      .then(({ requestData, branding }) => {
        if (ignore) return;
        setRequests(requestData);
        setSchoolBranding(branding);
        setLoading(false);
      })
      .catch((error) => {
        if (ignore) return;
        setLoadError(getErrorMessage(error, 'Não foi possível carregar o histórico agora.'));
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [cpf, navigate]);

  useEffect(() => {
    if (!cpf || !requests.some((request) => request.status === PRODUCTION_STATUS)) return;

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      void loadRequests(cpf)
        .then((requestData) => {
          if (cancelled) return;
          setRequests(requestData);
        })
        .catch(() => {});
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [cpf, requests]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleReportIssue = async () => {
    if (!issueNotes.trim()) return alert('Por favor, descreva o problema.');

    setSubmittingIssue(true);
    try {
      await reportPortalIssue({
        cpf,
        requestId: reportingIssueId as number,
        issueNotes,
      });

      setReportingIssueId(null);
      setIssueNotes('');
      setRequests(await loadRequests(cpf));
      setLoadError('');
      alert('Sua solicitação de revisão foi enviada!');
    } catch {
      alert('Erro ao relatar problema.');
    } finally {
      setSubmittingIssue(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-red-200 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/pedidos')}
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <h1 className="text-2xl font-extrabold text-slate-800">Histórico completo</h1>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe seus documentos e baixe o PDF quando ele estiver pronto.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-500 shadow-sm sm:block">
            {requests.length} solicitações
          </div>
        </div>

        {loadError ? (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setLoadError('');
                  void fetchHistoryState(cpf)
                    .then(({ requestData, branding }) => {
                      setRequests(requestData);
                      setSchoolBranding(branding);
                      setLoading(false);
                    })
                    .catch((error) => {
                      setLoadError(getErrorMessage(error, 'Não foi possível carregar o histórico agora.'));
                      setLoading(false);
                    });
                }}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
            Carregando histórico...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-sm">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
              <Clock className="h-4 w-4 text-primary" /> Todos os pedidos
            </h2>
            <ul className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
              {requests.map((req) => (
                <PedidoItem
                  key={req.id}
                  req={req}
                  isReporting={reportingIssueId === req.id}
                  issueNotes={issueNotes}
                  loading={submittingIssue}
                  onReport={() => setReportingIssueId(req.id)}
                  onCancelReport={() => {
                    setReportingIssueId(null);
                    setIssueNotes('');
                  }}
                  onIssueNotesChange={setIssueNotes}
                  onSubmitIssue={handleReportIssue}
                />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
