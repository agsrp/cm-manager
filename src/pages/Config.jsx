import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseSignupClient } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS } from '../data/constants';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  RefreshCw,
  Users,
  UserPlus,
  Shield,
  Mail,
  Lock,
} from 'lucide-react';
import GlassModal from '../components/GlassModal';
import NotificationSettings from '../components/NotificationSettings';
import ConfirmModal from '../components/ConfirmModal';
import { Bell } from 'lucide-react';

const PRESET_COLORS = [
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
];

const emptyForm = {
  name: '',
  logo_url: '',
  color_theme: '#8b5cf6',
  notes: '',
  hashtags: '',
  platforms: [],
};

const emptyMemberForm = {
  email: '',
  password: '',
  role: 'member',
};

export default function Config() {
  const { user } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('brands'); // 'brands' or 'team'
  
  // Brands States
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editBrandId, setEditBrandId] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  // Team States
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberDeletingId, setMemberDeletingId] = useState(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    if (error) {
      alert(error.message);
    } else {
      setBrands(data || []);
    }
    setLoading(false);
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    setTeamLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error.message);
    } else {
      setTeamMembers(data || []);
      
      // Auto-register current user if they aren't in team_members yet
      const currentUserEmail = user?.email;
      if (currentUserEmail) {
        const exists = (data || []).some(
          (m) => m.email.toLowerCase() === currentUserEmail.toLowerCase()
        );
        if (!exists) {
          await supabase.from('team_members').insert({
            email: currentUserEmail.toLowerCase(),
            role: 'admin',
          });
          // Re-fetch
          const refetched = await supabase
            .from('team_members')
            .select('*')
            .order('created_at', { ascending: false });
          setTeamMembers(refetched.data || []);
        }
      }
    }
    setTeamLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBrands();
    fetchTeamMembers();
  }, [fetchBrands, fetchTeamMembers]);

  // Brand CRUD handlers
  const handleCreateNew = () => {
    setForm(emptyForm);
    setEditBrandId(null);
    setIsEditing(true);
    setFormModalOpen(true);
  };

  const handleEditBrand = (brand) => {
    setForm({
      name: brand.name || '',
      logo_url: brand.logo_url || '',
      color_theme: brand.color_theme || '#8b5cf6',
      notes: brand.notes || '',
      hashtags: brand.hashtags || '',
      platforms: brand.platforms || [],
    });
    setEditBrandId(brand.id);
    setIsEditing(true);
    setFormModalOpen(true);
  };

  // Brand Deletion State & Handler
  const [brandDeleteOpen, setBrandDeleteOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);

  const requestDeleteBrand = (brandId, brandName) => {
    setBrandToDelete({ id: brandId, name: brandName });
    setBrandDeleteOpen(true);
  };

  const handleConfirmDeleteBrand = async () => {
    if (!brandToDelete) return;

    setDeletingId(brandToDelete.id);
    const { error } = await supabase.from('brands').delete().eq('id', brandToDelete.id);
    setDeletingId(null);
    setBrandDeleteOpen(false);

    if (error) {
      alert(error.message);
    } else {
      if (editBrandId === brandToDelete.id) {
        setIsEditing(false);
        setForm(emptyForm);
      }
      setBrandToDelete(null);
      await fetchBrands();
    }
  };

  const handleCheckboxChange = (platform) => {
    setForm((prev) => {
      const isSelected = prev.platforms.includes(platform);
      const updatedPlatforms = isSelected
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms: updatedPlatforms };
    });
  };

  const handleSubmitBrand = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      alert('El nombre de la marca es obligatorio.');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      logo_url: form.logo_url.trim() || null,
      color_theme: form.color_theme,
      notes: form.notes.trim() || null,
      hashtags: form.hashtags.trim() || null,
      platforms: form.platforms,
    };

    let error = null;
    if (editBrandId) {
      const res = await supabase
        .from('brands')
        .update(payload)
        .eq('id', editBrandId);
      error = res.error;
    } else {
      const res = await supabase.from('brands').insert(payload);
      error = res.error;
    }

    setSaving(false);

    if (error) {
      alert(error.message);
    } else {
      setIsEditing(false);
      setFormModalOpen(false);
      setForm(emptyForm);
      setEditBrandId(null);
      await fetchBrands();
    }
  };

  // Team member creation handler
  const handleAddTeamMember = async (event) => {
    event.preventDefault();
    
    if (!memberForm.email.trim() || !memberForm.password.trim()) {
      alert('El email y la contraseña inicial son obligatorios.');
      return;
    }

    if (memberForm.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setMemberSaving(true);

    const emailLower = memberForm.email.trim().toLowerCase();

    // Check database if they already exist in list
    const exists = teamMembers.some((m) => m.email.toLowerCase() === emailLower);
    if (exists) {
      alert('Esta cuenta de correo ya se encuentra en la lista de miembros.');
      setMemberSaving(false);
      return;
    }

    // 1. Create the user in Supabase auth using the async client that does not persist session
    const { data: authData, error: authError } = await supabaseSignupClient.auth.signUp({
      email: emailLower,
      password: memberForm.password,
    });

    if (authError) {
      alert(`Error al registrar en Supabase Auth: ${authError.message}`);
      setMemberSaving(false);
      return;
    }

    // 2. Insert into the public profiles/team_members table
    const { error: dbError } = await supabase
      .from('team_members')
      .insert({
        email: emailLower,
        role: memberForm.role,
      });

    setMemberSaving(false);

    if (dbError) {
      alert(`Error al registrar miembro en base de datos: ${dbError.message}`);
    } else {
      setMemberModalOpen(false);
      setMemberForm(emptyMemberForm);
      await fetchTeamMembers();
      alert(`El miembro "${emailLower}" ha sido agregado con éxito.`);
    }
  };

  // Team member deletion State & Handler
  const [memberDeleteOpen, setMemberDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const requestDeleteMember = (memberId, memberEmail) => {
    setMemberToDelete({ id: memberId, email: memberEmail });
    setMemberDeleteOpen(true);
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;

    setMemberDeletingId(memberToDelete.id);
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberToDelete.id);
    setMemberDeletingId(null);
    setMemberDeleteOpen(false);

    if (error) {
      alert(error.message);
    } else {
      setMemberToDelete(null);
      await fetchTeamMembers();
    }
  };

  // Sub-component for brand edit form
  const BrandForm = () => (
    <form onSubmit={handleSubmitBrand} className="space-y-4">
      <div>
        <label className="label-glass">Nombre de la Marca</label>
        <input
          type="text"
          className="input-glass"
          placeholder="Ej: Nike, Starbucks, Coca-Cola..."
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
      </div>

      <div>
        <label className="label-glass">Logo URL (Opcional)</label>
        <input
          type="text"
          className="input-glass"
          placeholder="https://..."
          value={form.logo_url}
          onChange={(e) => setForm((p) => ({ ...p, logo_url: e.target.value }))}
        />
      </div>

      <div>
        <label className="label-glass">Color de Tema (Tarjetas y Agenda)</label>
        <div className="flex flex-wrap items-center gap-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm((p) => ({ ...p, color_theme: color }))}
              className={`h-8 w-8 rounded-full border-2 transition active:scale-95 ${
                form.color_theme === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={form.color_theme}
            onChange={(e) => setForm((p) => ({ ...p, color_theme: e.target.value }))}
            className="h-8 w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent p-0"
            title="Color personalizado"
          />
        </div>
      </div>

      <div>
        <label className="label-glass">Redes Sociales Activas</label>
        <p className="text-[11px] text-slate-400 mb-2">
          Selecciona las redes sociales que maneja esta marca. Al crear posts, solo se mostrarán estas opciones.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/25 p-3">
          {PLATFORMS.map((platform) => {
            const isChecked = form.platforms.includes(platform);
            return (
              <label
                key={platform}
                className="flex items-center gap-3 cursor-pointer select-none rounded-xl p-2 transition hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleCheckboxChange(platform)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-800 text-violet-500 focus:ring-violet-400 focus:ring-opacity-25"
                />
                <span className="text-xs font-semibold text-slate-300">{platform}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-glass">Pautas / Notas de Marca (Drive, accesos...)</label>
        <textarea
          rows={4}
          className="input-glass resize-none"
          placeholder="Escribe pautas de diseño, tono de voz, links a Drive con assets..."
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
      </div>

      <div>
        <label className="label-glass">Hashtags recurrentes</label>
        <input
          type="text"
          className="input-glass"
          placeholder="Ej: #marca #summer #fashion"
          value={form.hashtags}
          onChange={(e) => setForm((p) => ({ ...p, hashtags: e.target.value }))}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setFormModalOpen(false);
            setForm(emptyForm);
          }}
          className="btn-glass flex-1 sm:flex-initial"
        >
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-initial">
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar Marca'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Configuración</h1>
          <p className="text-sm text-slate-400">
            Administra tus marcas, configura sus redes sociales y gestiona el acceso del equipo
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={activeTab === 'brands' ? fetchBrands : fetchTeamMembers} 
            className="btn-glass"
            disabled={loading || teamLoading}
          >
            <RefreshCw size={16} className={(loading || teamLoading) ? 'animate-spin' : ''} />
            Actualizar
          </button>
          
          {activeTab === 'brands' ? (
            <button onClick={handleCreateNew} className="btn-primary">
              <Plus size={16} />
              Nueva marca
            </button>
          ) : (
            <button onClick={() => setMemberModalOpen(true)} className="btn-primary">
              <UserPlus size={16} />
              Agregar Miembro
            </button>
          )}
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('brands')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition rounded-2xl ${
            activeTab === 'brands'
              ? 'border border-white/15 bg-white/15 text-white'
              : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <Settings size={16} />
          Marcas
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition rounded-2xl ${
            activeTab === 'team'
              ? 'border border-white/15 bg-white/15 text-white'
              : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <Users size={16} />
          Equipo
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition rounded-2xl ${
            activeTab === 'notifications'
              ? 'border border-white/15 bg-white/15 text-white'
              : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <Bell size={16} />
          Notificaciones
        </button>
      </div>

      {/* Tab content wrapper */}
      {activeTab === 'notifications' ? (
        <NotificationSettings />
      ) : activeTab === 'brands' ? (
        loading ? (
          <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
            Cargando marcas...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Brands List */}
            <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto pr-2">
              {brands.length === 0 ? (
                <div className="glass p-8 text-center text-sm text-slate-400">
                  No hay marcas configuradas. Crea una para comenzar.
                </div>
              ) : (
                brands.map((brand) => {
                  const isSelected = editBrandId === brand.id;
                  const hasLogo = brand.logo_url && brand.logo_url.startsWith('http');
                  const initial = brand.name ? brand.name.charAt(0).toUpperCase() : 'M';
                  
                  return (
                    <motion.div
                      key={brand.id}
                      whileHover={{ y: -2 }}
                      className={`glass p-4 flex items-center justify-between gap-4 transition duration-200 ${
                        isSelected && isEditing
                          ? 'border-violet-500/40 bg-white/10 ring-2 ring-violet-500/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {hasLogo ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="h-10 w-10 rounded-2xl object-cover border border-white/10 animate-fade"
                          />
                        ) : (
                          <div
                            className="grid h-10 w-10 place-items-center rounded-2xl text-sm font-black border border-white/10 text-white"
                            style={{ backgroundColor: brand.color_theme || '#8b5cf6' }}
                          >
                            {initial}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{brand.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {brand.platforms && brand.platforms.length > 0
                              ? brand.platforms.join(', ')
                              : 'Sin redes definidas'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleEditBrand(brand)}
                          className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/15 active:scale-95"
                          title="Editar marca"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => requestDeleteBrand(brand.id, brand.name)}
                          disabled={deletingId === brand.id}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20 active:scale-95"
                          title="Eliminar marca"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Desktop Brand Form */}
            <div className="hidden lg:block lg:col-span-3">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key={editBrandId ? `edit-${editBrandId}` : 'new'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="glass p-6 sticky top-6"
                  >
                    <h3 className="text-lg font-black text-white mb-4">
                      {editBrandId ? 'Editar Configuración de Marca' : 'Nueva Marca'}
                    </h3>
                    <BrandForm />
                  </motion.div>
                ) : (
                  <div className="glass p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px] border-dashed">
                    <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-slate-400">
                      <Settings size={28} />
                    </div>
                    <h3 className="text-sm font-bold text-white">Editar Marca</h3>
                    <p className="max-w-xs text-xs text-slate-400 mt-1">
                      Selecciona una marca de la lista para editar su perfil, configurar sus redes sociales o ver detalles.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      ) : (
        /* Team Members Tab Content */
        teamLoading ? (
          <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
            Cargando miembros del equipo...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Team Members List */}
            <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto pr-2">
              {teamMembers.length === 0 ? (
                <div className="glass p-8 text-center text-sm text-slate-400">
                  No hay miembros registrados en el equipo.
                </div>
              ) : (
                teamMembers.map((member) => {
                  const initial = member.email ? member.email.charAt(0).toUpperCase() : 'U';
                  const isSelf = member.email.toLowerCase() === user?.email?.toLowerCase();
                  
                  return (
                    <motion.div
                      key={member.id}
                      whileHover={{ y: -2 }}
                      className="glass p-4 flex items-center justify-between gap-4 transition hover:bg-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl text-sm font-black border border-white/10 bg-violet-600/30 text-violet-300">
                          {initial}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate flex items-center gap-2">
                            {member.email}
                            {isSelf && (
                              <span className="chip border-emerald-400/20 bg-emerald-500/10 text-emerald-300 text-[9px] py-0.5">Tú</span>
                            )}
                          </p>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider ${
                            member.role === 'admin' 
                              ? 'bg-red-500/10 border border-red-500/20 text-red-300' 
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                          }`}>
                            {member.role === 'admin' ? 'Administrador' : 'Colaborador'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={() => requestDeleteMember(member.id, member.email)}
                          disabled={isSelf || memberDeletingId === member.id}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20 active:scale-95 disabled:opacity-40 disabled:hover:bg-red-500/10 disabled:cursor-not-allowed"
                          title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Quitar miembro'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Desktop Team Guidelines Card */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="glass p-6 sticky top-6 space-y-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/20 text-violet-300 mb-2">
                  <Shield size={22} />
                </div>
                <h3 className="text-lg font-black text-white">Seguridad y Acceso Compartido</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Para que tu equipo trabaje de forma colaborativa, agrega a nuevos miembros mediante su correo electrónico y asígnales una contraseña inicial.
                </p>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3 text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">Detalles a tener en cuenta:</p>
                  <ul className="list-disc pl-4 space-y-2">
                    <li>Todos los miembros registrados compartirán el acceso inmediato al Dashboard, Pipeline de posts, Calendario y Configuración.</li>
                    <li>Por seguridad, los procesos de registro se realizan de forma encriptada sin exponer claves administrativas en la web app.</li>
                    <li>Si necesitas suspender permanentemente el inicio de sesión de un usuario de Supabase Auth, recuerda desactivar la cuenta en el panel administrativo oficial de Supabase.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Mobile Brand Form Modal */}
      <GlassModal
        open={formModalOpen && isEditing && activeTab === 'brands'}
        onClose={() => {
          setIsEditing(false);
          setFormModalOpen(false);
          setForm(emptyForm);
        }}
        title={editBrandId ? 'Editar Marca' : 'Nueva Marca'}
        size="lg"
      >
        <div className="pb-4">
          <BrandForm />
        </div>
      </GlassModal>

      {/* Add Team Member Modal */}
      <GlassModal
        open={memberModalOpen}
        onClose={() => {
          setMemberModalOpen(false);
          setMemberForm(emptyMemberForm);
        }}
        title="Agregar Miembro al Equipo"
      >
        <form onSubmit={handleAddTeamMember} className="space-y-4 pb-2">
          <div>
            <label className="label-glass">Correo Electrónico</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                className="input-glass pl-11"
                placeholder="colaborador@agencia.com"
                value={memberForm.email}
                onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label-glass">Contraseña Inicial</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                className="input-glass pl-11"
                placeholder="Contraseña inicial (mín. 6 caracteres)"
                value={memberForm.password}
                onChange={(e) => setMemberForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label-glass">Rol del Miembro</label>
            <select
              className="input-glass"
              value={memberForm.role}
              onChange={(e) => setMemberForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="member">Colaborador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-white/10 pt-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setMemberModalOpen(false);
                setMemberForm(emptyMemberForm);
              }}
              className="btn-glass flex-1 sm:flex-initial"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={memberSaving} 
              className="btn-primary flex-1 sm:flex-initial"
            >
              {memberSaving ? 'Registrando...' : 'Registrar Miembro'}
            </button>
          </div>
        </form>
      </GlassModal>

      {/* Modal gráfico de confirmación de eliminación de marca */}
      <ConfirmModal
        open={brandDeleteOpen}
        onClose={() => setBrandDeleteOpen(false)}
        onConfirm={handleConfirmDeleteBrand}
        title="¿Eliminar marca?"
        message={`¿Estás seguro de eliminar la marca "${brandToDelete?.name || ''}"? Se eliminarán en cascada todos los posts vinculados a ella.`}
        confirmText="Eliminar Marca"
        cancelText="Cancelar"
        type="danger"
        loading={deletingId === brandToDelete?.id}
      />

      {/* Modal gráfico de confirmación de eliminación de miembro del equipo */}
      <ConfirmModal
        open={memberDeleteOpen}
        onClose={() => setMemberDeleteOpen(false)}
        onConfirm={handleConfirmDeleteMember}
        title="¿Quitar miembro del equipo?"
        message={`¿Estás seguro de quitar a "${memberToDelete?.email || ''}" del equipo?`}
        confirmText="Quitar Miembro"
        cancelText="Cancelar"
        type="danger"
        loading={memberDeletingId === memberToDelete?.id}
      />
    </div>
  );
}
