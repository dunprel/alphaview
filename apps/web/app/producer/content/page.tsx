'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Upload, Eye, Edit, Trash2, Film, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ProducerSidebar from '@/components/producer/ProducerSidebar';
import api from '@/lib/api/client';
import { formatNgn, formatDuration, timeAgo } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  live:       'av-badge-green',
  review:     'av-badge-yellow',
  processing: 'av-badge-purple',
  draft:      'av-badge',
  rejected:   'av-badge-red',
};

const STATUS_ICONS: Record<string, any> = {
  live:       CheckCircle,
  review:     Clock,
  processing: AlertCircle,
  rejected:   XCircle,
};

export default function ProducerContentPage() {
  const [content,  setContent]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/producer/content', {
      params: { status: filter === 'all' ? undefined : filter, page, limit: 12 },
    });
    setContent(data.data);
    setTotal(data.meta.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, page]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/content/${id}`);
      toast.success('Content deleted');
      setContent(prev => prev.filter(c => c.id !== id));
    } catch { toast.error('Failed to delete content'); }
  };

  const FILTERS = [
    { label: 'All',        value: 'all'        },
    { label: 'Live',       value: 'live'       },
    { label: 'In Review',  value: 'review'     },
    { label: 'Processing', value: 'processing' },
    { label: 'Draft',      value: 'draft'      },
    { label: 'Rejected',   value: 'rejected'   },
  ];

  return (
    <div className="flex min-h-screen bg-av-bg">
      <ProducerSidebar active="content" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>My Content</h1>
            <p className="text-av-text-muted text-sm mt-1">{total} title{total !== 1 ? 's' : ''} uploaded</p>
          </div>
          <Link href="/producer/upload" className="btn-primary text-sm">
            <Upload size={16} /> Upload New
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-av-surface border border-av-border rounded-av overflow-hidden w-fit mb-6">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-4 py-2 text-xs font-medium transition-all whitespace-nowrap ${filter === f.value ? 'text-white' : 'text-av-text-muted hover:text-av-text'}`}
              style={filter === f.value ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton rounded-av-lg aspect-[2/3]" />
            ))}
          </div>
        ) : content.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Film size={48} className="text-av-text-dim mb-4" />
            <h3 className="text-av-text font-semibold text-lg mb-2">No content found</h3>
            <p className="text-av-text-muted text-sm mb-6">Upload your first film to get started</p>
            <Link href="/producer/upload" className="btn-primary">Upload Film</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {content.map((c, i) => {
              const StatusIcon = STATUS_ICONS[c.status];
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="av-card overflow-hidden group">
                  {/* Thumbnail */}
                  <div className="relative aspect-[2/3] bg-av-elevated">
                    {c.thumbnailUrl
                      ? <img src={c.thumbnailUrl} alt={c.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🎬</div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-av-bg via-transparent to-transparent" />

                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`av-badge text-[10px] ${STATUS_STYLES[c.status] ?? 'av-badge'}`}>
                        {StatusIcon && <StatusIcon size={9} />}
                        {c.status}
                      </span>
                    </div>

                    {/* Action overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                      <Link href={`/movies/${c.id}`}
                        className="w-9 h-9 rounded-full bg-av-surface border border-av-border flex items-center justify-center text-av-text-muted hover:text-av-purple-lt hover:border-av-purple transition-all"
                        title="Preview">
                        <Eye size={15} />
                      </Link>
                      <Link href={`/producer/content/${c.id}/edit`}
                        className="w-9 h-9 rounded-full bg-av-surface border border-av-border flex items-center justify-center text-av-text-muted hover:text-av-purple-lt hover:border-av-purple transition-all"
                        title="Edit">
                        <Edit size={15} />
                      </Link>
                      <button onClick={() => handleDelete(c.id, c.title)}
                        className="w-9 h-9 rounded-full bg-av-surface border border-av-border flex items-center justify-center text-av-text-muted hover:text-av-danger hover:border-av-danger transition-all"
                        title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-av-text text-sm line-clamp-1 mb-1">{c.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-av-text-muted">{formatDuration(c.durationMins)}</span>
                      <span className="text-xs font-mono font-semibold av-text-gradient">{formatNgn(c.priceNgn)}</span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-av-border">
                      <div className="text-center flex-1">
                        <div className="text-xs font-semibold text-av-text">{c.viewCount?.toLocaleString() ?? 0}</div>
                        <div className="text-[10px] text-av-text-dim">Views</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-xs font-semibold text-av-text">{c.purchaseCount?.toLocaleString() ?? 0}</div>
                        <div className="text-[10px] text-av-text-dim">Sales</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-xs font-semibold text-av-success">{formatNgn((c.purchaseCount ?? 0) * (c.priceNgn ?? 0) * 0.8)}</div>
                        <div className="text-[10px] text-av-text-dim">Earned</div>
                      </div>
                    </div>

                    {/* Rejection reason */}
                    {c.status === 'rejected' && c.rejectionReason && (
                      <div className="mt-3 p-2 rounded bg-av-danger/10 border border-av-danger/20">
                        <p className="text-xs text-av-danger leading-relaxed">{c.rejectionReason}</p>
                      </div>
                    )}

                    <div className="text-[10px] text-av-text-dim mt-2">{timeAgo(c.createdAt)}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="btn-secondary text-sm disabled:opacity-40">← Previous</button>
            <span className="text-xs text-av-text-muted">Page {page} of {Math.ceil(total / 12)}</span>
            <button disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-sm disabled:opacity-40">Next →</button>
          </div>
        )}
      </main>
    </div>
  );
}
