import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { endOfDay, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Clapperboard, RefreshCw, Scissors, Send } from 'lucide-react';

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function PostMiniCard({ post }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{post.title}</p>
          <p className="truncate text-xs text-slate-400">
            {post.brands?.name || 'Sin marca'} · {post.platform}
          </p>
        </div>
        <span className="chip shrink-0">
          {post.post_date
            ? format(new Date(post.post_date), 'd MMM', { locale: es })
            : 'Sin fecha'}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [recordItems, setRecordItems] = useState([]);
  const [editItems, setEditItems] = useState([]);
  const [publishItems, setPublishItems] = useState([]);
  const [shoots, setShoots] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);

    const start = startOfDay(new Date()).toISOString();
    const end = endOfDay(new Date()).toISOString();

    const [recordRes, editRes, publishRes, shootsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*, brands(name)')
        .eq('status', 'to_record')
        .limit(20),
      supabase
        .from('posts')
        .select('*, brands(name)')
        .eq('status', 'to_edit')
        .limit(20),
      supabase
        .from('posts')
        .select('*, brands(name)')
        .in('status', ['scheduled', 'published'])
        .gte('post_date', start)
        .lte('post_date', end)
        .order('post_date'),
      supabase
        .from('shooting_days')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date'),
    ]);

    setRecordItems(recordRes.data || []);
    setEditItems(editRes.data || []);
    setPublishItems(publishRes.data || []);
    setShoots(shootsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-sm capitalize text-slate-400">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        <button onClick={load} className="btn-glass">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      {loading ? (
        <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
          Cargando tareas de hoy...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="glass p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400/20 text-amber-300">
                  <Clapperboard size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-black">Qué grabar</h2>
                  <p className="text-xs text-slate-400">Rodajes y pendientes</p>
                </div>
              </div>
              <Link to="/production" className="btn-glass px-3 py-2 text-xs">
                Producción
              </Link>
            </div>

            <div className="space-y-3">
              {shoots.map((shoot) => (
                <div
                  key={shoot.id}
                  className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4"
                >
                  <p className="text-sm font-bold">
                    Rodaje · {format(new Date(shoot.date), 'HH:mm', { locale: es })}
                  </p>
                  <p className="text-xs text-slate-300">
                    {shoot.location || 'Ubicación por definir'}
                  </p>
                </div>
              ))}

              {recordItems.slice(0, 8).map((post) => (
                <PostMiniCard key={post.id} post={post} />
              ))}

              {shoots.length === 0 && recordItems.length === 0 ? (
                <EmptyState text="No hay grabaciones pendientes para hoy." />
              ) : null}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="glass p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-400/20 text-pink-300">
                  <Scissors size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-black">Qué editar</h2>
                  <p className="text-xs text-slate-400">En cola de edición</p>
                </div>
              </div>
              <Link to="/pipeline" className="btn-glass px-3 py-2 text-xs">
                Pipeline
              </Link>
            </div>

            <div className="space-y-3">
              {editItems.slice(0, 10).map((post) => (
                <PostMiniCard key={post.id} post={post} />
              ))}

              {editItems.length === 0 ? (
                <EmptyState text="No hay contenido pendiente de edición." />
              ) : null}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="glass p-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/20 text-emerald-300">
                  <Send size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-black">Publicaciones de hoy</h2>
                  <p className="text-xs text-slate-400">Programado / publicado</p>
                </div>
              </div>
              <Link to="/calendar" className="btn-glass px-3 py-2 text-xs">
                Calendario
              </Link>
            </div>

            <div className="space-y-3">
              {publishItems.map((post) => (
                <PostMiniCard key={post.id} post={post} />
              ))}

              {publishItems.length === 0 ? (
                <EmptyState text="No hay publicaciones programadas para hoy." />
              ) : null}
            </div>
          </motion.section>
        </div>
      )}
    </div>
  );
}
