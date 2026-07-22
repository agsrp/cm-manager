import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../lib/supabase';
import GlassModal from '../components/GlassModal';
import { statusMeta } from '../data/constants';
import { Sparkles, CalendarDays } from 'lucide-react';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1, locale: es }),
  getDay,
  locales: { es },
});

const messages = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  showMore: (count) => `+${count}`,
};

export default function SharedCalendar() {
  const { brandId } = useParams();
  const [brand, setBrand] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch brand details (Public/Anon access allowed)
      const brandRes = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandRes.error) {
        throw new Error('La marca especificada no existe o no se puede acceder.');
      }
      setBrand(brandRes.data);

      // 2. Fetch posts of this brand with scheduled dates
      const postsRes = await supabase
        .from('posts')
        .select('*')
        .eq('brand_id', brandId)
        .not('post_date', 'is', null)
        .order('post_date');

      if (postsRes.error) {
        throw postsRes.error;
      }

      const mapped = (postsRes.data || []).map((post) => ({
        id: post.id,
        title: `${post.title} · ${post.platform}`,
        start: new Date(post.post_date),
        end: new Date(post.post_date),
        resource: {
          ...post,
          brands: brandRes.data, // Attach brand details manually
        },
      }));

      setEvents(mapped);
    } catch (err) {
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eventPropGetter = (event) => {
    const meta = statusMeta(event.resource?.status);
    return {
      style: {
        backgroundColor: meta.hex,
        color: '#0f172a',
        borderRadius: '10px',
        border: 'none',
        fontWeight: 800,
      },
    };
  };

  const post = selectedEvent?.resource;
  const meta = post ? statusMeta(post.status) : null;
  const hasLogo = brand && brand.logo_url && brand.logo_url.startsWith('http');
  const initial = brand && brand.name ? brand.name.charAt(0).toUpperCase() : 'M';

  if (error) {
    return (
      <div className="app-bg grid min-h-screen place-items-center p-4">
        <div className="w-full max-w-md glass-strong p-6 text-center space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-500/20 text-red-300">
            <CalendarDays size={24} />
          </div>
          <h2 className="text-lg font-black text-white">Agenda no disponible</h2>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen flex flex-col text-slate-100 p-4 md:p-8">
      {/* Brand Branded Header */}
      <header className="mx-auto w-full max-w-7xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          {loading ? (
            <div className="h-12 w-12 rounded-2xl bg-white/5 animate-pulse" />
          ) : hasLogo ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="h-12 w-12 rounded-2xl object-cover border border-white/15 shadow-lg"
            />
          ) : (
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-black border border-white/15 text-white"
              style={{ backgroundColor: brand?.color_theme || '#8b5cf6' }}
            >
              {initial}
            </div>
          )}

          <div>
            {loading ? (
              <>
                <div className="h-6 w-48 rounded bg-white/5 animate-pulse mb-1.5" />
                <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
              </>
            ) : (
              <>
                <h1 className="text-xl font-black text-white">Agenda de Contenidos</h1>
                <p className="text-xs text-slate-400">
                  Planificación de contenidos para {brand.name} (Modo de Lectura)
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 border border-white/10 bg-white/5 px-3 py-2 rounded-2xl">
          <Sparkles size={14} className="text-violet-400" />
          CM Manager Portal
        </div>
      </header>

      {/* Main Calendar Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 flex flex-col">
        {loading ? (
          <div className="glass p-12 text-center text-sm font-semibold text-slate-300 flex-1 flex items-center justify-center">
            Cargando agenda de contenidos...
          </div>
        ) : (
          <div className="glass h-[70vh] p-4 md:p-6 flex-1">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              culture="es"
              messages={messages}
              defaultView="month"
              eventPropGetter={eventPropGetter}
              onSelectEvent={(event) => setSelectedEvent(event)}
              style={{ height: '100%' }}
              popup
            />
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="mx-auto w-full max-w-7xl text-center text-[10px] text-slate-500 py-6">
        Esta agenda se actualiza en tiempo real · CM Manager © {new Date().getFullYear()}
      </footer>

      {/* Read-Only Post Detail Modal */}
      <GlassModal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={post?.title || 'Detalle de la Publicación'}
      >
        {post ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{post.platform}</span>
              <span 
                className="chip capitalize"
                style={{ 
                  borderColor: `${meta?.hex}33`, 
                  color: meta?.hex 
                }}
              >
                {meta?.label}
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="label-glass">Fecha de Publicación</p>
              <p className="text-sm font-semibold capitalize">
                {format(new Date(post.post_date), "EEEE d MMM yyyy HH:mm", {
                  locale: es,
                })}
              </p>
            </div>

            {post.copy ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="label-glass">Contenido del Post</p>
                <p className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed">
                  {post.copy}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Sin texto de descripción definido.</p>
            )}

            {post.media_url ? (
              <a
                href={post.media_url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full text-center"
              >
                Ver Contenido multimedia / Referencia
              </a>
            ) : null}
          </div>
        ) : null}
      </GlassModal>
    </div>
  );
}
