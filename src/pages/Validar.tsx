import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, FileBadge2, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import type { RequestRecord } from '../lib/portalTypes';

export default function Validar() {
  const { protocol } = useParams<{ protocol: string }>();
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<RequestRecord | null>(null);

  useEffect(() => {
    async function validateDocument() {
      if (!protocol) return;
      
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('protocol', protocol)
        .in('status', ['Finalizado', 'Pronto para download/retirada'])
        .single();
        
      if (!error && data) {
        setRequestData(data as RequestRecord);
      }
      setLoading(false);
    }
    
    validateDocument();
  }, [protocol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const issuedAt = requestData?.updated_at ?? requestData?.created_at;
  const resultUrl = requestData?.result_url ?? undefined;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <FileBadge2 className="h-12 w-12 text-primary mx-auto" />
        <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
          Validação de Documento
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Portal Oficial do Colégio EduCRM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {requestData ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Documento Autêntico</h3>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Este documento é verdadeiro e foi emitido oficialmente pela nossa instituição.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3 border border-gray-100">
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Código / Protocolo</span>
                  <p className="font-medium text-gray-900">{requestData.protocol}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Tipo de Documento</span>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <FileBadge2 className="h-4 w-4 text-primary" /> {requestData.document_name}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Aluno(a)</span>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> {requestData.student_name}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase font-semibold">Data de Emissão</span>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> 
                    {issuedAt ? format(new Date(issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data indisponivel'}
                  </p>
                </div>
              </div>

              <a 
                href={resultUrl} 
                target="_blank" 
                rel="noreferrer"
                className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-900 focus:outline-none"
              >
                Visualizar Cópia Digital
              </a>
            </div>
          ) : (
            <div className="text-center animate-in fade-in zoom-in-95">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Documento Inválido</h3>
              <p className="text-sm text-gray-500 mt-2">
                O código <strong>{protocol}</strong> não foi encontrado ou o documento foi cancelado pela secretaria.
              </p>
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  Cuidado: Não aceite documentos que não possam ser validados nesta página oficial. Em caso de dúvidas, entre em contato com a escola.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm font-medium text-primary hover:underline">
              Ir para a Página Inicial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
