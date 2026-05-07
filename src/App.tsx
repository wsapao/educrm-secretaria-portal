import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Validar from './pages/Validar';
import { DEFAULT_SCHOOL_BRANDING, loadSchoolBranding } from './lib/branding';

function App() {
  useEffect(() => {
    let isMounted = true;

    document.title = `Secretaria Digital | ${DEFAULT_SCHOOL_BRANDING.nome}`;

    void loadSchoolBranding().then((branding) => {
      if (!isMounted) return;
      document.title = `Secretaria Digital | ${branding.nome}`;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/pedidos" element={<Dashboard />} />
        <Route path="/validar/:protocol" element={<Validar />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
