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

const items = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
  { to: '/pipeline', label: 'Pipeline', icon: Layers },
  { to: '/calendar', label: 'Calendario', icon: CalendarDays },
  { to: '/private', label: 'Agenda Privada', icon: Lock },
  { to: '/production', label: 'Producción', icon: Clapperboard },
  { to: '/config', label: 'Configuración', icon: Settings },
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
    <NavLink to={item.to} end={item.end} className="flex-1">
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.92 }}
          className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-1 text-[10px] font-semibold transition ${
            isActive ? 'text-white' : 'text-slate-400'
          }`}
        >
          <span
            className={`grid h-10 w-14 place-items-center rounded-2xl border transition ${
              isActive
                ? 'border-white/20 bg-white/15'
                : 'border-transparent bg-transparent'
            }`}
          >
            <item.icon size={20} />
          </span>
          {item.label}
        </motion.span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
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
          <button onClick={handleSignOut} className="btn-glass w-full">
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

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/85 backdrop-blur-2xl md:hidden">
        <div className="mx-auto flex w-full max-w-lg items-stretch px-2 pt-2 pb-safe">
          {items.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}

          <button onClick={handleSignOut} className="flex-1">
            <motion.span
              whileTap={{ scale: 0.92 }}
              className="flex flex-col items-center gap-1 rounded-2xl px-1 py-1 text-[10px] font-semibold text-slate-400"
            >
              <span className="grid h-10 w-14 place-items-center rounded-2xl border border-transparent">
                <LogOut size={20} />
              </span>
              Salir
            </motion.span>
          </button>
        </div>
      </nav>
    </div>
  );
}
