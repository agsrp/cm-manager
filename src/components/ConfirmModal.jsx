import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, LogOut, HelpCircle, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  type = 'danger', // 'danger' | 'warning' | 'info'
  loading = false,
}) {
  if (!open) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={24} className="text-red-400" />;
      case 'warning':
        return <LogOut size={24} className="text-amber-400" />;
      default:
        return <HelpCircle size={24} className="text-violet-400" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/15 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/15 border-amber-500/30';
      default:
        return 'bg-violet-500/15 border-violet-500/30';
    }
  };

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20';
      case 'warning':
        return 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20';
      default:
        return 'btn-primary';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${getIconBg()}`}>
              {getIcon()}
            </div>

            <div className="space-y-1 pr-6">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="btn-glass flex-1 sm:flex-none py-2.5 px-4 text-xs"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition active:scale-95 flex-1 sm:flex-none ${getConfirmBtnClass()} ${
                loading ? 'opacity-50 cursor-wait' : ''
              }`}
            >
              {loading ? 'Procesando...' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
