import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import GlassModal from '../components/GlassModal';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Link2,
  MapPin,
  Package,
  Plus,
  Shirt,
  Trash2,
  Unlink,
} from 'lucide-react';

function stringToArray(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function Production() {
  const [days, setDays] = useState([]);
  const [toRecordPosts, setToRecordPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    location: '',
    props_needed: '',
    clothing_needed: '',
  });

  const load = useCallback(async () => {
    setLoading(true);

    const [daysRes, postsRes] = await Promise.all([
      supabase
        .from('shooting_days')
        .select('*, posts(id,title,platform,status,brand_id,brands(name))')
        .order('date', { ascending: false }),
      supabase
        .from('posts')
        .select('*, brands(name)')
        .eq('status', 'to_record')
        .order('post_date'),
    ]);

    setDays(daysRes.data || []);
    setToRecordPosts(postsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError('');
    setForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      location: '',
      props_needed: '',
      clothing_needed: '',
    });
    setCreateOpen(true);
  };

  const createDay = async (event) => {
    event.preventDefault();

    if (!form.date) {
      setError('La fecha es obligatoria.');
      return;
    }

    setSaving(true);

    const payload = {
      date: new Date(form.date).toISOString(),
      location: form.location.trim(),
      props_needed: stringToArray(form.props_needed),
      clothing_needed: stringToArray(form.clothing_needed),
    };

    const { error: insertError } = await supabase
      .from('shooting_days')
      .insert(payload);

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCreateOpen(false);
    await load();
  };

  const linkPost = async (postId, dayId) => {
    if (!postId) return;

    const { error: updateError } = await supabase
      .from('posts')
      .update({ shooting_day_id: dayId })
      .eq('id', postId);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    await load();
  };

  const unlinkPost = async (postId) => {
    const { error: updateError } = await supabase
      .from('posts')
      .update({ shooting_day_id: null })
      .eq('id', postId);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    await load();
  };

  const deleteDay = async (dayId) => {
    const confirmed = window.confirm(
      '¿Eliminar este día de rodaje? Los posts vinculados se desvincularán.'
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from('shooting_days')
      .delete()
      .eq('id', dayId);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    await load();
  };

  const availablePosts = toRecordPosts.filter((post) => !post.shooting_day_id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Modo Producción</h1>
          <p className="text-sm text-slate-400">
            Planifica días de rodaje y vincula contenido por grabar
          </p>
        </div>

        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          Día de rodaje
        </button>
      </header>

      {loading ? (
        <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
          Cargando producción...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {days.map((day) => (
            <motion.article
              key={day.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="glass p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/20 text-violet-300">
                    <CalendarDays size={18} />
                  </span>
                  <div>
                    <h2 className="text-sm font-black capitalize">
                      {format(new Date(day.date), "EEEE d 'de' MMMM yyyy", {
                        locale: es,
                      })}
                    </h2>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={12} />
                      {day.location || 'Ubicación por definir'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteDay(day.id)}
                  className="rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20 active:scale-95"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                    <Package size={14} /> Props
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(day.props_needed || []).length ? (
                      day.props_needed.map((prop) => (
                        <span key={prop} className="chip">
                          {prop}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Sin props</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                    <Shirt size={14} /> Ropa
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(day.clothing_needed || []).length ? (
                      day.clothing_needed.map((item) => (
                        <span key={item} className="chip">
                          {item}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">Sin ropa definida</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="label-glass">Posts vinculados</p>
                <div className="space-y-2">
                  {(day.posts || []).map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{post.title}</p>
                        <p className="truncate text-xs text-slate-400">
                          {post.brands?.name || 'Sin marca'} · {post.platform}
                        </p>
                      </div>

                      <button
                        onClick={() => unlinkPost(post.id)}
                        className="btn-glass shrink-0 px-3 py-2 text-xs"
                      >
                        <Unlink size={14} />
                        Desvincular
                      </button>
                    </div>
                  ))}

                  {(day.posts || []).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-center text-xs text-slate-500">
                      Aún no hay posts vinculados a este rodaje
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="label-glass">Vincular post por grabar</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    defaultValue=""
                    onChange={(event) => linkPost(event.target.value, day.id)}
                    className="input-glass"
                  >
                    <option value="">Selecciona un post</option>
                    {availablePosts.map((post) => (
                      <option key={post.id} value={post.id}>
                        {post.title} · {post.brands?.name || 'Sin marca'}
                      </option>
                    ))}
                  </select>

                  <div className="btn-glass cursor-default justify-center opacity-70">
                    <Link2 size={16} />
                    {availablePosts.length} disponibles
                  </div>
                </div>
              </div>
            </motion.article>
          ))}

          {days.length === 0 ? (
            <div className="glass p-8 text-center text-sm text-slate-400 xl:col-span-2">
              No hay días de rodaje creados. Crea el primero para planificar
              grabaciones.
            </div>
          ) : null}
        </div>
      )}

      <GlassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo día de rodaje"
      >
        <form onSubmit={createDay} className="space-y-4">
          <div>
            <label className="label-glass">Fecha</label>
            <input
              type="date"
              className="input-glass"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
            />
          </div>

          <div>
            <label className="label-glass">Ubicación</label>
            <input
              className="input-glass"
              placeholder="Estudio, exterior, casa del cliente..."
              value={form.location}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location: event.target.value }))
              }
            />
          </div>

          <div>
            <label className="label-glass">Props necesarios</label>
            <input
              className="input-glass"
              placeholder="Separados por coma: aro de luz, trípode, producto"
              value={form.props_needed}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  props_needed: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className="label-glass">Ropa / vestuario</label>
            <input
              className="input-glass"
              placeholder="Separados por coma: outfit blanco, zapatillas"
              value={form.clothing_needed}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  clothing_needed: event.target.value,
                }))
              }
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="btn-glass"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creando...' : 'Crear día de rodaje'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
