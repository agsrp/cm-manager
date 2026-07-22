import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Clapperboard,
  Home,
  Layers,
  Lightbulb,
  Lock,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const items = [
  { to: '/', label: 'Inicio', mobileLabel: 'Inicio', icon: Home, end: true },
  { to: '/ideas', label: 'Ideas', mobileLabel: 'Ideas', icon: Lightbulb },
  { to: '/pipeline', label: 'Pipeline', mobileLabel: 'Pipeline', icon: Layers },
  { to: '/calendar', label: 'Calendario', mobileLabel: 'Agenda', icon: CalendarDays },
  { to: '/private', label: 'Agenda Privada', mobileLabel: 'Privada', icon: Lock },
  { to: '/production', label: 'Producción', mobileLabel: 'Producción', icon: Clapperboard },
  { to: '/config', label: 'Configuración', mobileLabel: 'Config', icon: Settings },
];

function DesktopNavItem({ item }) {
  return (
    <NavLink to={item.to} end={item.end}>
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.96 }}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            isActive
              ? 'border border-white/15 bg-white/15 text-white'
              : 'border border-transparent text-slate-300 hover:bg-white/10'
          }`}
        >
          <item.icon size={18} />
          {item.label}
        </motion.span>
      )}
    </NavLink>
  );
}

function MobileNavItem({ item }) {
  return (
    <NavLink to={item.to} end={item.end} className="flex-1 min-w-[48px] shrink-0 text-center">
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.92 }}
          className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[9.5px] font-semibold transition ${
            isActive ? 'text-white' : 'text-slate-400'
          }`}
        >
          <span
            className={`grid h-8 w-8 place-items-center rounded-xl border transition ${
              isActive
                ? 'border-white/20 bg-white/15 text-white'
                : 'border-transparent bg-transparent text-slate-400'
            }`}
          >
            <item.icon size={18} />
          </span>
          <span className="truncate w-full max-w-[56px] px-0.5 text-center leading-tight">
            {item.mobileLabel || item.label}
          </span>
        </motion.span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOutConfirm = async () => {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    setLogoutConfirmOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-bg min-h-screen">
      <aside className="fixed inset-y-4 left-4 z-40 hidden w-72 flex-col justify-between rounded-3xl border border-white/15 bg-slate-900/70 p-5 backdrop-blur-2xl md:flex">
        <div>
          <div className="mb-8 flex items-center gap-3 px-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/80">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="text-sm font-black">CM Manager</p>
              <p className="text-xs text-slate-400">Producción social</p>
            </div>
          </div>

          <nav className="space-y-2">
            {items.map((item) => (
              <DesktopNavItem key={item.to} item={item} />
            ))}
          </nav>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-slate-400">Sesión activa</p>
            <p className="truncate text-sm font-semibold">{user?.email}</p>
          </div>
          <button onClick={() => setLogoutConfirmOpen(true)} className="btn-glass w-full">
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 px-4 pb-3 backdrop-blur-2xl md:hidden pt-safe">
        <div className="flex items-center gap-3 pt-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/80">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">CM Manager</p>
            <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-4 md:pb-10 md:pl-[21rem] md:pr-8 md:pt-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/90 backdrop-blur-2xl md:hidden max-w-full overflow-hidden">
        <div className="flex w-full items-center justify-between overflow-x-auto no-scrollbar px-1 pt-1.5 pb-safe touch-pan-x">
          {items.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}

          <button onClick={() => setLogoutConfirmOpen(true)} className="flex-1 min-w-[44px] shrink-0 text-center">
            <motion.span
              whileTap={{ scale: 0.92 }}
              className="flex flex-col items-center gap-0.5 rounded-xl py-1 text-[9.5px] font-semibold text-slate-400"
            >
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-transparent">
                <LogOut size={18} />
              </span>
              <span className="truncate w-full max-w-[56px] px-0.5 text-center leading-tight">Salir</span>
            </motion.span>
          </button>
        </div>
      </nav>

      {/* Modal de confirmación para cerrar sesión */}
      <ConfirmModal
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleSignOutConfirm}
        title="¿Cerrar sesión?"
        message="¿Estás seguro de que deseas salir de tu cuenta de CM Manager?"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        type="warning"
        loading={loggingOut}
      />
    </div>
  );
}
