import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function GlassModal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}) {
  const sizes = {
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900/85 p-5 pb-safe shadow-glass backdrop-blur-2xl sm:rounded-3xl ${sizes[size]}`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/10 p-2 transition hover:bg-white/20 active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
