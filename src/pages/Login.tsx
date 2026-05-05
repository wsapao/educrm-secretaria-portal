import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, ShieldCheck, Phone } from 'lucide-react';
import type { LoginStep } from '../lib/portalTypes';

const API_URL = import.meta.env.VITE_EDUCRM_API_URL || 'https://crm.esjt.com.br';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function Login() {
  const [cpf, setCpf] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<LoginStep>('CPF');
  const [loading, setLoading] = useState(false);
  const [phonePreview, setPhonePreview] = useState('');
  const navigate = useNavigate();

  const handleCpfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) return alert('CPF inválido');

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth-cpf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'CPF não encontrado ou sem telefone cadastrado.');
      }

      setPhonePreview(data.phonePreview || '');
      alert(`Código enviado para o WhatsApp com final ${(data.phonePreview || '').slice(-4)}`);
      setStep('CODE');
    } catch (error) {
      alert(getErrorMessage(error, 'Erro ao validar CPF'));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return alert('O código deve ter 6 números');

    setLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');

      const res = await fetch(`${API_URL}/api/auth-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cleanCpf, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Código inválido ou expirado');
      }

      localStorage.setItem('portal_token', data.token);
      localStorage.setItem('portal_cpf', cleanCpf);
      localStorage.setItem('portal_contacts', JSON.stringify(data.contacts ?? []));

      navigate('/pedidos');
    } catch (error) {
      alert(getErrorMessage(error, 'Erro ao validar código'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Secretaria Digital
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Solicite documentos sem precisar criar senhas.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">

          {step === 'CPF' ? (
            <form onSubmit={handleCpfSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CPF do Responsável
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="Somente números"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Consultando...' : 'Receber Código no WhatsApp'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-primary p-4 mb-6">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-primary mr-2" />
                  <p className="text-sm text-blue-700">
                    Enviamos um código de 6 dígitos para o seu WhatsApp
                    {phonePreview ? ` (${phonePreview})` : ''}.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Código de Verificação
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: 123456"
                    className="appearance-none text-center tracking-widest text-2xl font-bold block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-300 focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {loading ? 'Validando...' : 'Acessar Secretaria'}
                <ShieldCheck className="ml-2 h-5 w-5" />
              </button>

              <div className="text-center mt-4">
                <button type="button" onClick={() => setStep('CPF')} className="text-sm text-primary font-medium hover:underline">
                  Voltar e digitar outro CPF
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
