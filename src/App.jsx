import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ideas from './pages/Ideas';
import Pipeline from './pages/Pipeline';
import CalendarPage from './pages/CalendarPage';
import Production from './pages/Production';
import Config from './pages/Config';
import SharedCalendar from './pages/SharedCalendar';
import PrivateAgenda from './pages/PrivateAgenda';

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-bg grid min-h-screen place-items-center">
        <div className="glass px-6 py-4 text-sm font-semibold">
          Cargando sesión...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/shared/:brandId" element={<SharedCalendar />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/private" element={<PrivateAgenda />} />
            <Route path="/production" element={<Production />} />
            <Route path="/config" element={<Config />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
