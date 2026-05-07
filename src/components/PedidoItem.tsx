import { Download, AlertTriangle, Clock, FileCheck, Activity } from 'lucide-react';
import type { RequestRecord } from '../lib/portalTypes';

function isReadyRequest(req: RequestRecord) {
  return req.status !== 'Cancelado' && Boolean(req.result_url);
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Pronto para download/retirada' || status === 'Finalizado') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700">
        <FileCheck className="h-3 w-3" /> Pronto
      </span>
    );
  }
  if (status === 'Cancelado') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold text-red-700">
        Cancelado
      </span>
    );
  }
  if (status === 'Em produção') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
        <Activity className="h-3 w-3" /> Em produção
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-[11px] font-bold text-yellow-700">
      <Clock className="h-3 w-3" /> {status}
    </span>
  );
}

function statusIconStyle(status: string): { bg: string; icon: React.ReactElement } {
  if (status === 'Pronto para download/retirada' || status === 'Finalizado')
    return { bg: 'bg-green-50', icon: <FileCheck className="h-4 w-4 text-green-600" /> };
  if (status === 'Em produção')
    return { bg: 'bg-violet-50', icon: <Activity className="h-4 w-4 text-violet-600" /> };
  return { bg: 'bg-yellow-50', icon: <Clock className="h-4 w-4 text-yellow-600" /> };
}

interface PedidoItemProps {
  req: RequestRecord;
  isReporting: boolean;
  issueNotes: string;
  loading: boolean;
  onReport: () => void;
  onCancelReport: () => void;
  onIssueNotesChange: (val: string) => void;
  onSubmitIssue: () => void;
}

export function PedidoItem({
  req, isReporting, issueNotes, loading,
  onReport, onCancelReport, onIssueNotesChange, onSubmitIssue,
}: PedidoItemProps) {
  const { bg, icon } = statusIconStyle(req.status);
  const isReady = isReadyRequest(req);

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${bg}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">{req.document_name}</p>
          <p className="text-[11px] text-slate-400">
            {req.protocol}
            {req.created_at && ` · ${new Date(req.created_at).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <StatusBadge status={req.status} />
          {isReady && req.result_url && (
            <a
              href={req.result_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100"
            >
              <Download className="h-3.5 w-3.5" /> Baixar PDF
            </a>
          )}
          {isReady && (
            <button
              onClick={onReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Relatar problema
            </button>
          )}
        </div>
      </div>

      {isReporting && (
        <div className="mx-5 mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            O que precisa ser corrigido?
          </label>
          <textarea
            rows={3}
            value={issueNotes}
            onChange={e => onIssueNotesChange(e.target.value)}
            className="mb-3 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: O nome da mãe saiu escrito errado..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancelReport}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={onSubmitIssue}
              disabled={loading}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-900 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar para revisão'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
