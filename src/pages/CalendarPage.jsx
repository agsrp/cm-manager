import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../lib/supabase';
import GlassModal from '../components/GlassModal';
import { statusMeta } from '../data/constants';
import { Share2, Copy, Check } from 'lucide-react';

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

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Sharing States
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedBrandId, setCopiedBrandId] = useState(null);

  const loadData = async () => {
    setLoading(true);

    const [postsRes, brandsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*, brands(name,color_theme)')
        .not('post_date', 'is', null)
        .order('post_date'),
      supabase
        .from('brands')
        .select('*')
        .order('name'),
    ]);

    const mapped = (postsRes.data || []).map((post) => ({
      id: post.id,
      title: `${post.title} · ${post.platform}`,
      start: new Date(post.post_date),
      end: new Date(post.post_date),
      resource: post,
    }));

    setEvents(mapped);
    setBrands(brandsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const copySharedLink = (brandId) => {
    const url = `${window.location.origin}/shared/${brandId}`;
    navigator.clipboard.writeText(url);
    setCopiedBrandId(brandId);
    setTimeout(() => setCopiedBrandId(null), 2000);
  };

  const post = selectedEvent?.resource;
  const meta = post ? statusMeta(post.status) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Calendario</h1>
          <p className="text-sm text-slate-400">
            Publicaciones programadas por fecha
          </p>
        </div>
        
        <button 
          onClick={() => setShareModalOpen(true)} 
          className="btn-glass"
          disabled={loading}
        >
          <Share2 size={16} />
          Compartir Agenda
        </button>
      </header>

      {loading ? (
        <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
          Cargando calendario...
        </div>
      ) : (
        <div className="glass h-[70vh] p-4 md:p-6">
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

      {/* Post Detail Modal */}
      <GlassModal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={post?.title || 'Detalle del post'}
      >
        {post ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="chip">{post.platform}</span>
              <span className="chip">{meta?.label}</span>
              <span className="chip">{post.brands?.name || 'Sin marca'}</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="label-glass">Fecha</p>
              <p className="text-sm font-semibold capitalize">
                {format(new Date(post.post_date), "EEEE d MMM yyyy HH:mm", {
                  locale: es,
                })}
              </p>
            </div>

            {post.copy ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="label-glass">Copy</p>
                <p className="whitespace-pre-wrap text-sm text-slate-200">
                  {post.copy}
                </p>
              </div>
            ) : null}

            {post.media_url ? (
              <a
                href={post.media_url}
                target="_blank"
                rel="noreferrer"
                className="btn-glass w-full"
              >
                Abrir media
              </a>
            ) : null}
          </div>
        ) : null}
      </GlassModal>

      {/* Share Calendar Modal */}
      <GlassModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Compartir Agenda con Clientes"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Copia el enlace de cliente de la marca que desees. Quien tenga el enlace podrá visualizar el calendario de contenidos en modo lectura sin necesidad de iniciar sesión en la plataforma.
          </p>

          <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto">
            {brands.length === 0 ? (
              <p className="text-xs italic text-slate-500 text-center py-4">No hay marcas configuradas para compartir.</p>
            ) : (
              brands.map((brand) => (
                <div 
                  key={brand.id} 
                  className="flex items-center justify-between gap-4 p-3 border border-white/10 bg-white/5 rounded-2xl"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="h-3 w-3 rounded-full shrink-0" 
                      style={{ backgroundColor: brand.color_theme || '#8b5cf6' }} 
                    />
                    <span className="text-sm font-semibold text-white truncate">{brand.name}</span>
                  </div>
                  
                  <button
                    onClick={() => copySharedLink(brand.id)}
                    className="btn-glass py-1.5 px-3 text-xs flex items-center gap-1.5 shrink-0"
                  >
                    {copiedBrandId === brand.id ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copiar enlace
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/10 pt-4 flex justify-end">
            <button 
              onClick={() => setShareModalOpen(false)} 
              className="btn-primary"
            >
              Cerrar
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
