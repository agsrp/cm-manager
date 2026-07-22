import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import PostFormModal from '../components/PostFormModal';
import GlassModal from '../components/GlassModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Ideas() {
  const [ideas, setIdeas] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  
  // Selection and UI States
  const [selectedIdeaId, setSelectedIdeaId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Deletion Modal State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [postsRes, brandsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*, brands(id,name,color_theme)')
        .eq('status', 'idea')
        .order('created_at', { ascending: false }),
      supabase
        .from('brands')
        .select('*')
        .order('name'),
    ]);

    setIdeas(postsRes.data || []);
    setBrands(brandsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy to Clipboard helper
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Promote Idea to Script
  const handlePromoteToScript = async (idea) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('posts')
      .update({ status: 'script' })
      .eq('id', idea.id);
    setActionLoading(false);

    if (error) {
      alert(error.message);
    } else {
      setSelectedIdeaId(null);
      setDetailModalOpen(false);
      await fetchData();
    }
  };

  // Trigger Delete Modal
  const requestDeleteIdea = (idea) => {
    setIdeaToDelete(idea);
    setDeleteConfirmOpen(true);
  };

  // Perform Delete Idea
  const handleConfirmDeleteIdea = async () => {
    if (!ideaToDelete) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', ideaToDelete.id);
    setActionLoading(false);
    setDeleteConfirmOpen(false);

    if (error) {
      alert(error.message);
    } else {
      setSelectedIdeaId(null);
      setDetailModalOpen(false);
      setIdeaToDelete(null);
      await fetchData();
    }
  };

  const openNewIdeaModal = () => {
    setSelectedPostForModal(null);
    setModalOpen(true);
  };

  const openEditIdeaModal = (idea) => {
    setSelectedPostForModal(idea);
    setModalOpen(true);
  };

  // Filter ideas based on search and brand
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.copy && idea.copy.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesBrand = selectedBrandId ? idea.brand_id === selectedBrandId : true;
    
    return matchesSearch && matchesBrand;
  });

  const selectedIdea = ideas.find((i) => i.id === selectedIdeaId);

  // Reusable Detail Content Component
  const IdeaDetailsContent = ({ idea }) => {
    if (!idea) return null;

    const brandTheme = idea.brands?.color_theme || '#8b5cf6';

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span 
              className="inline-block h-4 w-4 rounded-full" 
              style={{ backgroundColor: brandTheme }}
            />
            <span className="text-sm font-bold text-slate-300">
              {idea.brands?.name || 'Sin marca'}
            </span>
            <span className="chip">{idea.platform}</span>
          </div>
          <span className="text-xs text-slate-400">
            Creado el {format(new Date(idea.created_at), 'd MMM yyyy, HH:mm', { locale: es })}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-black text-white">{idea.title}</h2>
        </div>

        <div>
          <h4 className="label-glass">Detalles / Copy de la idea</h4>
          <div className="relative rounded-2xl border border-white/10 bg-black/30 p-4">
            {idea.copy ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                {idea.copy}
              </p>
            ) : (
              <p className="text-sm italic text-slate-500">Sin detalles ingresados. ¡Edita la idea para agregarlos!</p>
            )}
            
            {idea.copy && (
              <button 
                onClick={() => handleCopy(idea.copy)} 
                className="absolute right-3 top-3 rounded-lg bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 active:scale-95"
                title="Copiar detalles"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>

        {idea.media_url && (
          <div>
            <h4 className="label-glass">Enlace de referencia / Media URL</h4>
            <a 
              href={idea.media_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-violet-300 transition hover:bg-white/10"
            >
              <ExternalLink size={14} />
              Ver referencia externa
            </a>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
          <button 
            disabled={actionLoading}
            onClick={() => handlePromoteToScript(idea)} 
            className="btn-primary flex-1 sm:flex-initial"
          >
            <ArrowRight size={16} />
            Comenzar Guion
          </button>
          
          <button 
            disabled={actionLoading}
            onClick={() => openEditIdeaModal(idea)} 
            className="btn-glass flex-1 sm:flex-initial"
          >
            <Edit size={16} />
            Editar
          </button>

          <button 
            disabled={actionLoading}
            onClick={() => requestDeleteIdea(idea)} 
            className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 active:scale-95 flex-1 sm:flex-initial"
          >
            <Trash2 size={16} className="mx-auto sm:mx-0" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Banco de Ideas</h1>
          <p className="text-sm text-slate-400">
            Registra y detalla tus ideas creativas antes de iniciar la producción
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={fetchData} className="btn-glass">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={openNewIdeaModal} className="btn-primary">
            <Plus size={16} />
            Nueva idea
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-glass pl-11"
            placeholder="Buscar por título o contenido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <select
            className="input-glass"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
          >
            <option value="">Todas las marcas</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
          Cargando banco de ideas...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Ideas List Column */}
          <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
            {filteredIdeas.length === 0 ? (
              <div className="glass p-8 text-center text-sm text-slate-400">
                {ideas.length === 0 
                  ? 'No hay ideas registradas. Crea una para comenzar.' 
                  : 'Ninguna idea coincide con los filtros aplicados.'}
              </div>
            ) : (
              filteredIdeas.map((idea) => {
                const brandTheme = idea.brands?.color_theme || '#8b5cf6';
                const isSelected = selectedIdeaId === idea.id;

                return (
                  <motion.div
                    key={idea.id}
                    onClick={() => {
                      setSelectedIdeaId(idea.id);
                      setDetailModalOpen(true);
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`glass cursor-pointer p-4 transition duration-200 ${
                      isSelected 
                        ? 'border-violet-500/40 bg-white/10 ring-2 ring-violet-500/20' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                        {idea.title}
                      </h3>
                      <span 
                        className="h-2.5 w-2.5 shrink-0 rounded-full" 
                        style={{ backgroundColor: brandTheme }}
                      />
                    </div>
                    
                    {idea.copy && (
                      <p className="mb-3 line-clamp-2 text-xs text-slate-400">
                        {idea.copy}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip">{idea.platform}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {format(new Date(idea.created_at), 'd MMM', { locale: es })}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Desktop Detail Panel Column */}
          <div className="hidden lg:block lg:col-span-3">
            <AnimatePresence mode="wait">
              {selectedIdea ? (
                <motion.div
                  key={selectedIdea.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="glass p-6 sticky top-6"
                >
                  <IdeaDetailsContent idea={selectedIdea} />
                </motion.div>
              ) : (
                <div className="glass p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px] border-dashed">
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-slate-400">
                    <Lightbulb size={28} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Detalles de la idea</h3>
                  <p className="max-w-xs text-xs text-slate-400 mt-1">
                    Selecciona una idea de la lista para ver su descripción detallada y opciones de edición.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Mobile Detail Modal */}
      <GlassModal
        open={detailModalOpen && !!selectedIdea}
        onClose={() => setDetailModalOpen(false)}
        title="Detalles de la Idea"
        size="lg"
      >
        <div className="pb-4">
          <IdeaDetailsContent idea={selectedIdea} />
        </div>
      </GlassModal>

      {/* Create / Edit PostFormModal */}
      <PostFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        brands={brands}
        post={selectedPostForModal}
        onSaved={async () => {
          await fetchData();
          if (selectedPostForModal) {
            setSelectedIdeaId(selectedPostForModal.id);
          }
        }}
      />

      {/* Modal gráfico de confirmación de eliminación de idea */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeleteIdea}
        title="¿Eliminar idea?"
        message={`¿Estás seguro de que deseas eliminar la idea "${ideaToDelete?.title || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Idea"
        cancelText="Cancelar"
        type="danger"
        loading={actionLoading}
      />
    </div>
  );
}
