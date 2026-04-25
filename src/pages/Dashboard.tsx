import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Download, Clock, LogOut, FileBadge2, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);

  const cpf = localStorage.getItem('portal_cpf');
  // Em prod usar o token adequadamente, aqui estamos apenas pegando cpf do state

  useEffect(() => {
    if (!cpf) {
      navigate('/login');
      return;
    }
    
    // Carrega contatos salvos no login
    const savedContacts = JSON.parse(localStorage.getItem('portal_contacts') || '[]');
    setContacts(savedContacts);
    if(savedContacts.length > 0) setSelectedStudent(savedContacts[0].id.toString());

    loadData();
  }, [cpf]);

  async function loadData() {
    // Busca templates disponíveis
    const { data: tpls } = await supabase.from('document_templates').select('*').eq('active', true);
    if (tpls) setTemplates(tpls);

    // Busca histórico de solicitações
    const { data: reqs } = await supabase
      .from('requests')
      .select('*')
      .eq('requester_cpf', cpf)
      .order('created_at', { ascending: false });
    if (reqs) setRequests(reqs);
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleRequest = async () => {
    if (!selectedStudent || !selectedTemplate) return alert('Selecione aluno e documento');
    
    setLoading(true);
    try {
      const student = contacts.find(c => c.id.toString() === selectedStudent);
      const template = templates.find(t => t.id.toString() === selectedTemplate);

      // Se for um documento manual, cria direto no banco
      if (template.type === 'manual') {
        const protocol = `SEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabase.from('requests').insert([{
          protocol,
          requester_cpf: cpf,
          student_name: student.student_name,
          contact_id: student.id,
          template_id: template.id,
          document_name: template.name,
          channel: 'portal'
        }]);
        alert(`Protocolo ${protocol} gerado com sucesso!`);
        loadData();
      } 
      // Se for automático, chama a API de geração que já cria o pedido e faz upload
      else {
        // Chamada pra API Vercel
        const API_URL = import.meta.env.VITE_EDUCRM_API_URL || 'http://localhost:5173';
        
        // Primeiro cria o request provisorio no banco para pegar um ID
        const protocol = `SEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: reqData } = await supabase.from('requests').insert([{
          protocol, requester_cpf: cpf, student_name: student.student_name, contact_id: student.id, template_id: template.id, document_name: template.name, channel: 'portal', status: 'Em produção'
        }]).select().single();

        // Manda o ID pra API de geração gerar o PDF e anexar
        await fetch(`${API_URL}/api/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: reqData?.id,
            studentName: student.student_name,
            parentName: student.parent_name,
            templateName: template.name
          })
        });

        alert('Documento gerado com sucesso!');
        loadData();
      }
    } catch(err) {
      alert('Erro ao solicitar documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-4 px-6 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileBadge2 className="h-6 w-6" />
          <h1 className="font-bold text-lg">EduSecretaria</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center text-sm font-medium hover:text-gray-200 transition">
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        
        {/* Nova Solicitação */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" /> Nova Solicitação
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qual aluno?</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:ring-primary focus:border-primary"
                value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
              >
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.student_name} (Série: {c.grade || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Qual documento?</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 focus:ring-primary focus:border-primary"
                value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
              >
                <option value="">Selecione...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.estimated_days > 0 ? `(Prazo: ${t.estimated_days} dias)` : '(Imediato)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleRequest}
              disabled={loading || !selectedTemplate || !selectedStudent}
              className="bg-primary text-white font-medium py-2 px-6 rounded-lg hover:bg-blue-900 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? 'Processando...' : 'Solicitar Documento'}
            </button>
          </div>
        </section>

        {/* Meus Pedidos */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" /> Meus Pedidos
          </h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p>Nenhuma solicitação encontrada.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {requests.map(req => (
                  <li key={req.id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-primary">{req.protocol}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            req.status === 'Pronto para download/retirada' || req.status === 'Finalizado' 
                              ? 'bg-green-100 text-green-700' 
                              : req.status === 'Cancelado' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <h3 className="text-gray-900 font-medium">{req.document_name}</h3>
                        <p className="text-sm text-gray-500">Aluno(a): {req.student_name}</p>
                      </div>
                      
                      <div>
                        {req.result_url ? (
                          <a 
                            href={req.result_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium text-sm transition"
                          >
                            <Download className="w-4 h-4 mr-2" /> Baixar PDF
                          </a>
                        ) : (
                          <p className="text-xs text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> Aguardando processamento
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
