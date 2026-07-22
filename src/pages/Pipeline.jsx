import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { POST_STATUSES, statusMeta } from '../data/constants';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import PostFormModal from '../components/PostFormModal';

function DraggableCard({ post, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: post.id,
    data: { status: post.status },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 60 : undefined,
  };

  const meta = statusMeta(post.status);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEdit(post)}
      whileTap={{ scale: 0.97 }}
      className={`glass cursor-grab touch-none select-none p-4 active:cursor-grabbing ${
        isDragging ? 'opacity-80 shadow-2xl' : ''
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-tight">{post.title}</p>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
      </div>

      <p className="mb-3 truncate text-xs text-slate-400">
        {post.brands?.name || 'Sin marca'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">{post.platform}</span>
        <span className="chip">
          {post.post_date
            ? format(new Date(post.post_date), 'd MMM HH:mm', { locale: es })
            : 'Sin fecha'}
        </span>
      </div>
    </motion.div>
  );
}

function Column({ status, posts, onEdit }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[360px] w-[280px] shrink-0 flex-col rounded-3xl border p-3 transition ${
        isOver
          ? 'border-violet-300/50 bg-violet-500/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
          <h3 className="text-sm font-black">{status.label}</h3>
        </div>
        <span className="chip">{posts.length}</span>
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <DraggableCard key={post.id} post={post} onEdit={onEdit} />
        ))}

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-3 py-8 text-center text-xs text-slate-500">
            Arrastra posts aquí
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const [posts, setPosts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [postsRes, brandsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('*, brands(id,name,color_theme)')
        .order('post_date', { ascending: true }),
      supabase.from('brands').select('*').order('name'),
    ]);

    setPosts(postsRes.data || []);
    setBrands(brandsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    })
  );

  const handleDragEnd = async ({ active, over }) => {
    if (!over) return;

    const postId = active.id;
    const newStatus = over.id;

    const post = posts.find((item) => item.id === postId);
    if (!post || post.status === newStatus) return;

    const previousPosts = posts;

    setPosts((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, status: newStatus } : item
      )
    );

    const { error } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', postId);

    if (error) {
      setPosts(previousPosts);
      alert(error.message);
    }
  };

  const openNewPost = () => {
    setSelectedPost(null);
    setModalOpen(true);
  };

  const openEditPost = (post) => {
    setSelectedPost(post);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Pipeline</h1>
          <p className="text-sm text-slate-400">
            Arrastra y suelta para mover el estado de los posts
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={fetchData} className="btn-glass">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button onClick={openNewPost} className="btn-primary">
            <Plus size={16} />
            Nuevo post
          </button>
        </div>
      </header>

      {loading ? (
        <div className="glass p-8 text-center text-sm font-semibold text-slate-300">
          Cargando pipeline...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {POST_STATUSES.map((status) => (
              <Column
                key={status.id}
                status={status}
                posts={posts.filter((post) => post.status === status.id)}
                onEdit={openEditPost}
              />
            ))}
          </div>
        </DndContext>
      )}

      <PostFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        brands={brands}
        post={selectedPost}
        onSaved={fetchData}
      />
    </div>
  );
}
