import { useCallback, useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import GlassModal from '../components/GlassModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Plus,
  Search,
  RefreshCw,
  Calendar as CalendarIcon,
  ListTodo,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Tag,
  AlertCircle,
  Edit,
  Trash2,
  ShieldCheck,
  Briefcase,
  User,
  HeartPulse,
  DollarSign,
  Bell,
  Video,
  Sparkles,
  Filter,
} from 'lucide-react';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1, locale: es }),
  getDay,
  locales: { es },
});

const calendarMessages = {
  today: 'Hoy',
  previous: 'Anterior',
  next: 'Siguiente',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  showMore: (count) => `+${count}`,
};

const CATEGORIES = [
  { id: 'Personal', label: 'Personal', icon: User, color: '#8b5cf6' },
  { id: 'Reunión', label: 'Reunión / Llamada', icon: Video, color: '#3b82f6' },
  { id: 'Recordatorio', label: 'Recordatorio', icon: Bell, color: '#f59e0b' },
  { id: 'Evento', label: 'Evento / Cita', icon: CalendarIcon, color: '#ec4899' },
  { id: 'Médico', label: 'Salud / Médico', icon: HeartPulse, color: '#ef4444' },
  { id: 'Finanzas', label: 'Finanzas / Admin', icon: DollarSign, color: '#10b981' },
  { id: 'Proyecto', label: 'Proyecto Personal', icon: Briefcase, color: '#06b6d4' },
  { id: 'Otro', label: 'Otro', icon: Tag, color: '#64748b' },
];

const PRIORITIES = [
  { id: 'low', label: 'Baja', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { id: 'medium', label: 'Media', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'high', label: 'Alta', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { id: 'urgent', label: 'Urgente', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
];

const STATUSES = [
  { id: 'pending', label: 'Pendiente', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { id: 'in_progress', label: 'En curso', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  { id: 'completed', label: 'Completado', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  { id: 'cancelled', label: 'Cancelado', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
];

const PRESET_COLORS = [
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

const getTodayDateTimeString = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const emptyForm = {
  title: '',
  description: '',
  category: 'Personal',
  date: getTodayDateTimeString(),
  end_date: '',
  is_all_day: false,
  status: 'pending',
  priority: 'medium',
  color: '#8b5cf6',
  location: '',
};

export default function PrivateAgenda() {
  const { user } = useAuth();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Modals & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Local storage key for fallback/offline privacy guarantee
  const localStorageKey = `cm_private_activities_${user?.id || 'guest'}`;

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    let remoteData = null;
    let hasRemoteError = false;

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from('private_activities')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (!error && data) {
          remoteData = data;
        } else {
          hasRemoteError = true;
        }
      } catch (err) {
        hasRemoteError = true;
      }
    }

    if (remoteData) {
      setActivities(remoteData);
      localStorage.setItem(localStorageKey, JSON.stringify(remoteData));
    } else if (hasRemoteError || !user?.id) {
      // Fallback to localStorage
      const cached = localStorage.getItem(localStorageKey);
      if (cached) {
        try {
          setActivities(JSON.parse(cached));
        } catch {
          setActivities([]);
        }
      } else {
        setActivities([]);
      }
    }

    setLoading(false);
  }, [user, localStorageKey]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Por favor ingresa un título para la actividad.');
      return;
    }

    setSaving(true);

    const payload = {
      user_id: user?.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      date: new Date(form.date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      is_all_day: form.is_all_day,
      status: form.status,
      priority: form.priority,
      color: form.color,
      location: form.location.trim() || null,
    };

    let updatedList = [...activities];

    if (editingId) {
      // Update existing
      if (user?.id) {
        const { error } = await supabase
          .from('private_activities')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) {
          console.warn('Supabase update notice (using fallback):', error.message);
        }
      }

      updatedList = updatedList.map((item) =>
        item.id === editingId ? { ...item, ...payload, id: editingId } : item
      );
    } else {
      // Create new
      const newId = crypto.randomUUID();
      const newActivity = { ...payload, id: newId, created_at: new Date().toISOString() };

      if (user?.id) {
        const { data, error } = await supabase
          .from('private_activities')
          .insert(newActivity)
          .select()
          .single();

        if (error) {
          console.warn('Supabase insert notice (using fallback):', error.message);
          updatedList.unshift(newActivity);
        } else if (data) {
          updatedList.unshift(data);
        }
      } else {
        updatedList.unshift(newActivity);
      }
    }

    setActivities(updatedList);
    localStorage.setItem(localStorageKey, JSON.stringify(updatedList));

    setSaving(false);
    setModalOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleToggleComplete = async (activity) => {
    const nextStatus = activity.status === 'completed' ? 'pending' : 'completed';
    const updatedActivities = activities.map((item) =>
      item.id === activity.id ? { ...item, status: nextStatus } : item
    );

    setActivities(updatedActivities);
    localStorage.setItem(localStorageKey, JSON.stringify(updatedActivities));

    if (user?.id) {
      await supabase
        .from('private_activities')
        .update({ status: nextStatus })
        .eq('id', activity.id)
        .eq('user_id', user.id);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta actividad privada?');
    if (!confirmed) return;

    const filtered = activities.filter((item) => item.id !== activityId);
    setActivities(filtered);
    localStorage.setItem(localStorageKey, JSON.stringify(filtered));

    if (selectedActivity?.id === activityId) {
      setSelectedActivity(null);
      setDetailModalOpen(false);
    }

    if (user?.id) {
      await supabase
        .from('private_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id);
    }
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (activity) => {
    const formatDateForInput = (isoStr) => {
      if (!isoStr) return getTodayDateTimeString();
      const d = new Date(isoStr);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };

    setForm({
      title: activity.title || '',
      description: activity.description || '',
      category: activity.category || 'Personal',
      date: formatDateForInput(activity.date),
      end_date: activity.end_date ? formatDateForInput(activity.end_date) : '',
      is_all_day: Boolean(activity.is_all_day),
      status: activity.status || 'pending',
      priority: activity.priority || 'medium',
      color: activity.color || '#8b5cf6',
      location: activity.location || '',
    });
    setEditingId(activity.id);
    setDetailModalOpen(false);
    setModalOpen(true);
  };

  // Filter activities
  const filteredActivities = activities.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
  });

  // Calendar Event Mapping
  const calendarEvents = filteredActivities.map((act) => ({
    id: act.id,
    title: act.title,
    start: new Date(act.date),
    end: act.end_date ? new Date(act.end_date) : new Date(act.date),
    allDay: act.is_all_day,
    resource: act,
  }));

  const eventPropGetter = (event) => {
    const act = event.resource;
    const isDone = act?.status === 'completed';

    return {
      style: {
        backgroundColor: act?.color || '#8b5cf6',
        color: '#ffffff',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 700,
        opacity: isDone ? 0.6 : 1,
        textDecoration: isDone ? 'line-through' : 'none',
      },
    };
  };

  // Stats calculation
  const totalCount = activities.length;
  const pendingCount = activities.filter((a) => a.status === 'pending' || a.status === 'in_progress').length;
  const completedCount = activities.filter((a) => a.status === 'completed').length;
  const urgentCount = activities.filter((a) => (a.priority === 'high' || a.priority === 'urgent') && a.status !== 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
              <Lock size={18} />
            </span>
            <h1 className="text-2xl font-black">Agenda Privada</h1>
            <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs">
              <ShieldCheck size={12} />
              100% Personal & Confidencial
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Registra reuniones personales, compromisos, citas médicas, finanzas y tareas sin compartir con el equipo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchActivities} className="btn-glass">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <button onClick={openCreateModal} className="btn-primary">
            <Plus size={16} />
            Nueva Actividad
          </button>
        </div>
      </header>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-500/20 text-violet-300 border border-violet-500/30">
            <Tag size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Privadas</p>
            <p className="text-xl font-black text-white">{totalCount}</p>
          </div>
        </div>

        <div className="glass p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pendientes</p>
            <p className="text-xl font-black text-white">{pendingCount}</p>
          </div>
        </div>

        <div className="glass p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completadas</p>
            <p className="text-xl font-black text-white">{completedCount}</p>
          </div>
        </div>

        <div className="glass p-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prioridad Alta</p>
            <p className="text-xl font-black text-white">{urgentCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="glass p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View mode toggle */}
          <div className="flex items-center rounded-2xl border border-white/15 bg-black/30 p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'calendar' ? 'bg-violet-500/90 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon size={14} />
              Calendario
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'list' ? 'bg-violet-500/90 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListTodo size={14} />
              Lista de Tareas
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-glass pl-10 py-2 text-xs"
              placeholder="Buscar por título, notas o ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-white/10">
          <div>
            <label className="label-glass text-[10px] flex items-center gap-1">
              <Filter size={10} /> Categoría
            </label>
            <select
              className="input-glass py-2 text-xs"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-glass text-[10px]">Estado</label>
            <select
              className="input-glass py-2 text-xs"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              {STATUSES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-glass text-[10px]">Prioridad</label>
            <select
              className="input-glass py-2 text-xs"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="all">Todas las prioridades</option>
              {PRIORITIES.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
          Cargando agenda privada...
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="glass h-[70vh] p-4 md:p-6">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            culture="es"
            messages={calendarMessages}
            defaultView="month"
            eventPropGetter={eventPropGetter}
            onSelectEvent={(event) => {
              setSelectedActivity(event.resource);
              setDetailModalOpen(true);
            }}
            onSelectSlot={({ start }) => {
              const formattedDate = format(start, "yyyy-MM-dd'T'HH:mm");
              setForm({ ...emptyForm, date: formattedDate });
              setEditingId(null);
              setModalOpen(true);
            }}
            selectable
            style={{ height: '100%' }}
            popup
          />
        </div>
      ) : (
        /* List / Agenda View */
        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="glass p-8 text-center text-sm text-slate-400">
              {activities.length === 0
                ? 'No tienes actividades privadas aún. Haz clic en "Nueva Actividad" para agregar una.'
                : 'Ninguna actividad coincide con los filtros seleccionados.'}
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const catMeta = CATEGORIES.find((c) => c.id === activity.category) || CATEGORIES[0];
              const CatIcon = catMeta.icon;
              const priorityMeta = PRIORITIES.find((p) => p.id === activity.priority) || PRIORITIES[1];
              const statusMeta = STATUSES.find((s) => s.id === activity.status) || STATUSES[0];
              const isCompleted = activity.status === 'completed';

              return (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 ${
                    isCompleted ? 'opacity-70 bg-white/5' : 'hover:bg-white/10'
                  }`}
                  style={{ borderLeftColor: activity.color || '#8b5cf6' }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleComplete(activity)}
                      className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-400 transition"
                      title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={22} className="text-emerald-400" />
                      ) : (
                        <Circle size={22} />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-base font-bold text-white cursor-pointer hover:text-violet-300 transition ${
                            isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                          onClick={() => {
                            setSelectedActivity(activity);
                            setDetailModalOpen(true);
                          }}
                        >
                          {activity.title}
                        </h3>
                      </div>

                      {activity.description && (
                        <p className="text-xs text-slate-300 line-clamp-2">{activity.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-200">
                          <CatIcon size={13} style={{ color: catMeta.color }} />
                          {activity.category}
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {format(new Date(activity.date), "dd MMM yyyy, HH:mm 'hs'", { locale: es })}
                        </span>

                        {activity.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-300 truncate max-w-[200px]">
                              <MapPin size={13} className="text-rose-400" />
                              {activity.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <span className={`chip border text-[10px] uppercase tracking-wider font-bold ${priorityMeta.color}`}>
                      {priorityMeta.label}
                    </span>

                    <span className={`chip border text-[10px] uppercase tracking-wider font-bold ${statusMeta.badge}`}>
                      {statusMeta.label}
                    </span>

                    <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                      <button
                        onClick={() => openEditModal(activity)}
                        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/15 active:scale-95 transition"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-300 hover:bg-rose-500/20 active:scale-95 transition"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Activity Detail Modal */}
      <GlassModal
        open={detailModalOpen && !!selectedActivity}
        onClose={() => setDetailModalOpen(false)}
        title={selectedActivity?.title || 'Detalle de la Actividad Privada'}
      >
        {selectedActivity && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="chip border-violet-500/30 bg-violet-500/10 text-violet-300">
                {selectedActivity.category}
              </span>
              <span className={`chip border ${PRIORITIES.find((p) => p.id === selectedActivity.priority)?.color}`}>
                Prioridad: {PRIORITIES.find((p) => p.id === selectedActivity.priority)?.label}
              </span>
              <span className={`chip border ${STATUSES.find((s) => s.id === selectedActivity.status)?.badge}`}>
                {STATUSES.find((s) => s.id === selectedActivity.status)?.label}
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Fecha y Hora</span>
                {selectedActivity.is_all_day && (
                  <span className="chip bg-white/10 text-[10px]">Todo el día</span>
                )}
              </div>
              <p className="text-sm font-semibold text-white capitalize">
                {format(new Date(selectedActivity.date), "EEEE d 'de' MMMM yyyy - HH:mm 'hs'", { locale: es })}
              </p>
              {selectedActivity.end_date && (
                <p className="text-xs text-slate-400">
                  Finaliza: {format(new Date(selectedActivity.end_date), "EEEE d 'de' MMMM yyyy - HH:mm 'hs'", { locale: es })}
                </p>
              )}
            </div>

            {selectedActivity.location && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="label-glass">Ubicación / Enlace de reunión</p>
                <p className="text-sm text-slate-200">{selectedActivity.location}</p>
              </div>
            )}

            {selectedActivity.description && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="label-glass">Detalles / Notas privadas</p>
                <p className="whitespace-pre-wrap text-sm text-slate-200">{selectedActivity.description}</p>
              </div>
            )}

            <div className="flex gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => handleToggleComplete(selectedActivity)}
                className="btn-glass flex-1"
              >
                {selectedActivity.status === 'completed' ? 'Marcar Pendiente' : 'Marcar Completado'}
              </button>
              <button onClick={() => openEditModal(selectedActivity)} className="btn-primary flex-1">
                <Edit size={16} /> Editar
              </button>
              <button
                onClick={() => handleDeleteActivity(selectedActivity.id)}
                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-rose-300 hover:bg-rose-500/20 active:scale-95"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </GlassModal>

      {/* Create / Edit Activity Modal */}
      <GlassModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setForm(emptyForm);
          setEditingId(null);
        }}
        title={editingId ? 'Editar Actividad Privada' : 'Nueva Actividad Privada'}
        size="lg"
      >
        <form onSubmit={handleSaveActivity} className="space-y-4 pb-2">
          <div>
            <label className="label-glass">Título de la actividad *</label>
            <input
              type="text"
              required
              className="input-glass"
              placeholder="Ej: Reunión con contador, Consulta médica, Pago de servicio..."
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-glass">Categoría</label>
              <select
                className="input-glass"
                value={form.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  const presetColor = CATEGORIES.find((c) => c.id === cat)?.color || form.color;
                  setForm((p) => ({ ...p, category: cat, color: presetColor }));
                }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-glass">Prioridad</label>
              <select
                className="input-glass"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              >
                {PRIORITIES.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-glass">Fecha y Hora de Inicio *</label>
              <input
                type="datetime-local"
                required
                className="input-glass text-xs"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>

            <div>
              <label className="label-glass">Fecha y Hora de Fin (Opcional)</label>
              <input
                type="datetime-local"
                className="input-glass text-xs"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <input
              type="checkbox"
              id="is_all_day"
              checked={form.is_all_day}
              onChange={(e) => setForm((p) => ({ ...p, is_all_day: e.target.checked }))}
              className="h-4 w-4 rounded border-white/20 bg-slate-800 text-violet-500 focus:ring-violet-400"
            />
            <label htmlFor="is_all_day" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
              Evento de todo el día
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-glass">Estado inicial</label>
              <select
                className="input-glass"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                {STATUSES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-glass">Color en el calendario</label>
              <div className="flex items-center gap-2 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c }))}
                    className={`h-7 w-7 rounded-full border-2 transition ${
                      form.color === c ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                  className="h-7 w-9 cursor-pointer rounded-xl border border-white/10 bg-transparent p-0 ml-1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label-glass">Ubicación / Link (Opcional)</label>
            <input
              type="text"
              className="input-glass"
              placeholder="Ej: Av. Principal 1234, o link de Google Meet..."
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>

          <div>
            <label className="label-glass">Descripción / Notas privadas (Opcional)</label>
            <textarea
              rows={3}
              className="input-glass resize-none"
              placeholder="Detalles confidenciales, recordatorios o notas personales..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setForm(emptyForm);
                setEditingId(null);
              }}
              className="btn-glass"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : editingId ? 'Actualizar Actividad' : 'Crear Actividad Privada'}
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
