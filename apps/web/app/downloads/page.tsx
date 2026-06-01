// ════════════════════════════════════════════════════════
// app/downloads/page.tsx
// ════════════════════════════════════════════════════════
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Download, Play, Trash2, Lock, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import api from '@/lib/api/client';
import { getDaysRemaining, formatDuration, formatNgn } from '@/lib/utils';

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.get('/downloads')
      .then(r => setDownloads(r.data))
      .catch(() => setDownloads([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRevoke = async (contentId: string, title: string) => {
    if (!confirm(`Remove "${title}" from downloads?`)) return;
    try {
      await api.delete(`/downloads/${contentId}`);
      setDownloads(prev => prev.filter(d => d.content_id !== contentId));
      toast.success('Download removed');
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div className="min-h-screen bg-av-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl text-white" style={{ letterSpacing: '0.04em' }}>Downloads</h1>
          <p className="text-av-text-muted text-sm mt-2">
            Films available offline · Access tied to your 30-day purchase window
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-av-lg" />
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Download size={32} className="text-av-purple-lt" />
            </div>
            <h2 className="font-display text-2xl text-white mb-3" style={{ letterSpacing: '0.04em' }}>No downloads yet</h2>
            <p className="text-av-text-muted text-sm mb-8 max-w-xs leading-relaxed">
              Download films from the mobile app to watch without internet. Files expire with your 30-day access.
            </p>
            <Link href="/movies" className="btn-primary">Browse Films</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {downloads.map((d: any, i) => {
              const daysLeft = getDaysRemaining(d.expires_at);
              const isValid  = !d.key_revoked && daysLeft > 0;
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="av-card p-5 flex items-center gap-5">
                  {/* Thumbnail */}
                  <div className="w-16 h-24 rounded-av overflow-hidden bg-av-elevated flex-shrink-0 relative">
                    {d.thumbnail_url
                      ? <img src={d.thumbnail_url} alt={d.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🎬</div>
                    }
                    {!isValid && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Lock size={14} className="text-av-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-av-text text-sm truncate mb-1">{d.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-av-text-muted mb-2">
                      {d.duration_mins && <span><Clock size={10} className="inline mr-1" />{formatDuration(d.duration_mins)}</span>}
                      <span>{d.genre?.[0]}</span>
                    </div>
                    {isValid ? (
                      <div className={`av-badge text-[10px] ${daysLeft <= 3 ? 'av-badge-red' : daysLeft <= 7 ? 'av-badge-yellow' : 'av-badge-green'}`}>
                        <Clock size={9} /> {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
                      </div>
                    ) : (
                      <div className="av-badge-red text-[10px] av-badge">
                        <Lock size={9} /> Access expired
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isValid && (
                      <Link href={`/player/${d.content_id}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-av text-xs font-semibold text-white transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#d946ef)' }}>
                        <Play size={13} fill="white" /> Watch
                      </Link>
                    )}
                    {!isValid && (
                      <Link href={`/movies/${d.content_id}`}
                        className="btn-secondary text-xs py-2 px-3">
                        Re-buy
                      </Link>
                    )}
                    <button onClick={() => handleRevoke(d.content_id, d.title)}
                      className="w-8 h-8 rounded-av flex items-center justify-center text-av-text-muted hover:text-av-danger hover:bg-av-danger/10 border border-av-border hover:border-av-danger/30 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        {downloads.length > 0 && (
          <div className="mt-8 p-4 rounded-av-lg flex items-start gap-3"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <AlertCircle size={16} className="text-av-purple-lt flex-shrink-0 mt-0.5" />
            <p className="text-xs text-av-text-muted leading-relaxed">
              Downloads are encrypted and tied to your device. They automatically become unplayable when your 30-day access window closes.
              Re-purchasing a film resets your 30-day access.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
