export const POST_STATUSES = [
  { id: 'idea', label: 'Idea', dot: 'bg-slate-300', hex: '#cbd5e1' },
  { id: 'script', label: 'Guion', dot: 'bg-blue-400', hex: '#60a5fa' },
  { id: 'to_record', label: 'Por grabar', dot: 'bg-amber-400', hex: '#fbbf24' },
  { id: 'to_edit', label: 'Por editar', dot: 'bg-pink-400', hex: '#f472b6' },
  { id: 'review', label: 'Revisión', dot: 'bg-cyan-400', hex: '#22d3ee' },
  { id: 'scheduled', label: 'Programado', dot: 'bg-emerald-400', hex: '#34d399' },
  { id: 'published', label: 'Publicado', dot: 'bg-green-500', hex: '#22c55e' },
];

export const PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube Shorts',
  'LinkedIn',
  'X',
  'Facebook',
];

export function statusMeta(status) {
  return POST_STATUSES.find((item) => item.id === status) || POST_STATUSES[0];
}
