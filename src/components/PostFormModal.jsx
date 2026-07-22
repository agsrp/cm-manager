import { useEffect, useState } from 'react';
import GlassModal from './GlassModal';
import ConfirmModal from './ConfirmModal';
import { supabase } from '../lib/supabase';
import { PLATFORMS, POST_STATUSES } from '../data/constants';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

const emptyForm = {
  title: '',
  brand_id: '',
  platform: 'Instagram',
  status: 'idea',
  post_date: '',
  copy: '',
  media_url: '',
};

function toDatetimeLocal(value) {
  if (!value) return '';

  try {
    return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

export default function PostFormModal({
  open,
  onClose,
  brands = [],
  post = null,
  onSaved,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const handleDeletePost = async () => {
    if (!post?.id) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from('posts').delete().eq('id', post.id);
    setDeleting(false);
    setDeleteConfirmOpen(false);

    if (delErr) {
      setError(delErr.message);
      return;
    }

    await onSaved?.();
    onClose();
  };

  useEffect(() => {
    if (!open) return;

    setError('');

    if (post) {
      setForm({
        title: post.title || '',
        brand_id: post.brand_id || '',
        platform: post.platform || 'Instagram',
        status: post.status || 'idea',
        post_date: toDatetimeLocal(post.post_date),
        copy: post.copy || '',
        media_url: post.media_url || '',
      });
    } else {
      setForm({
        ...emptyForm,
        brand_id: brands[0]?.id || '',
      });
    }
  }, [open, post, brands]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrandChange = (brandId) => {
    updateField('brand_id', brandId);
    
    // Auto-select first active platform if current platform isn't supported by new brand
    const brand = brands.find((b) => b.id === brandId);
    if (brand && brand.platforms && brand.platforms.length > 0) {
      if (!brand.platforms.includes(form.platform)) {
        updateField('platform', brand.platforms[0]);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }

    if (!form.brand_id) {
      setError('Selecciona una marca.');
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      brand_id: form.brand_id,
      platform: form.platform,
      status: form.status,
      post_date: form.post_date ? new Date(form.post_date).toISOString() : null,
      copy: form.copy.trim(),
      media_url: form.media_url.trim() || null,
      notification_sent: false,
    };

    let result;

    if (post?.id) {
      result = await supabase.from('posts').update(payload).eq('id', post.id).select();
    } else {
      result = await supabase.from('posts').insert(payload).select();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await onSaved?.();
    onClose();
  };

  const selectedBrand = brands.find((b) => b.id === form.brand_id);
  const activePlatforms = selectedBrand && selectedBrand.platforms && selectedBrand.platforms.length > 0
    ? selectedBrand.platforms
    : PLATFORMS;

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      title={post ? 'Editar post' : 'Nuevo post'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-glass">Título</label>
            <input
              className="input-glass"
              placeholder="Ej: Reel lanzamiento colección verano"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </div>

          <div>
            <label className="label-glass">Marca</label>
            <select
              className="input-glass"
              value={form.brand_id}
              onChange={(event) => handleBrandChange(event.target.value)}
            >
              <option value="">Selecciona una marca</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-glass">Plataforma</label>
            <select
              className="input-glass"
              value={form.platform}
              onChange={(event) => updateField('platform', event.target.value)}
            >
              {activePlatforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-glass">Estado</label>
            <select
              className="input-glass"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {POST_STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-glass">Fecha de publicación</label>
            <input
              type="datetime-local"
              className="input-glass"
              value={form.post_date}
              onChange={(event) => updateField('post_date', event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label-glass">Copy</label>
            <textarea
              rows={4}
              className="input-glass resize-none"
              placeholder="Texto del post, hashtags, CTA..."
              value={form.copy}
              onChange={(event) => updateField('copy', event.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label-glass">Media URL</label>
            <input
              className="input-glass"
              placeholder="https://..."
              value={form.media_url}
              onChange={(event) => updateField('media_url', event.target.value)}
            />
          </div>
        </div>

        {selectedBrand && (selectedBrand.notes || selectedBrand.hashtags) && (
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Referencias de {selectedBrand.name}
            </h4>
            
            {selectedBrand.notes && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Pautas de marca / Enlaces</p>
                <p className="text-xs text-slate-300 whitespace-pre-wrap bg-black/20 p-2 rounded-xl border border-white/5 max-h-24 overflow-y-auto mt-1">
                  {selectedBrand.notes}
                </p>
              </div>
            )}
            
            {selectedBrand.hashtags && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Hashtags recurrentes</p>
                  <p className="text-xs text-violet-300 truncate mt-1">{selectedBrand.hashtags}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const separator = form.copy ? '\n\n' : '';
                    updateField('copy', form.copy + separator + selectedBrand.hashtags);
                  }}
                  className="btn-glass px-2.5 py-1.5 text-xs shrink-0"
                >
                  Insertar en Copy
                </button>
              </div>
            )}
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row border-t border-white/10 pt-4">
          {post?.id ? (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={saving}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <Trash2 size={15} />
              Eliminar Post
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onClose} className="btn-glass flex-1 sm:flex-initial">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-initial">
              {saving ? 'Guardando...' : post ? 'Actualizar post' : 'Crear post'}
            </button>
          </div>
        </div>
      </form>

      {/* Modal de confirmación gráfica de eliminación */}
      <ConfirmModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeletePost}
        title="¿Eliminar post?"
        message={`¿Estás seguro de que deseas eliminar "${form.title || 'este post'}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Post"
        cancelText="Cancelar"
        type="danger"
        loading={deleting}
      />
    </GlassModal>
  );
}
