'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Film, Image, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import ProducerSidebar from '@/components/producer/ProducerSidebar';
import { contentApi } from '@/lib/api/content';
import type { UploadContentForm } from '@/types';

const GENRES = ['Drama', 'Comedy', 'Action', 'Romance', 'Thriller', 'Horror',
  'Documentary', 'Nollywood', 'Animation', 'Family', 'Crime', 'Historical'];
const AGE_RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'];

const schema = z.object({
  title:       z.string().min(2, 'Enter the film title'),
  description: z.string().min(50, 'Synopsis must be at least 50 characters'),
  genre:       z.array(z.string()).min(1, 'Select at least one genre'),
  type:        z.enum(['movie', 'series', 'documentary', 'short']),
  priceNgn:    z.number().min(500, 'Minimum price is ₦500').max(50000, 'Maximum price is ₦50,000'),
  ageRating:   z.string().min(1, 'Select an age rating'),
  castList:    z.string().min(1, 'List the cast'),
  releaseDate: z.string().min(1, 'Enter release date'),
});

type Step = 'details' | 'media' | 'review' | 'done';

interface UploadState {
  videoFile?:     File;
  thumbnailFile?: File;
  trailerFile?:   File;
  videoProgress:  number;
  thumbProgress:  number;
  uploading:      boolean;
}

export default function UploadPage() {
  const [step,   setStep]   = useState<Step>('details');
  const [upload, setUpload] = useState<UploadState>({ videoProgress: 0, thumbProgress: 0, uploading: false });
  const [contentId, setContentId] = useState<string | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<UploadContentForm>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'movie', genre: [], priceNgn: 1500 },
  });

  const selectedGenres = watch('genre') || [];

  // ── Step 1: Submit metadata ──────────────────────────────────────────────
  const onMetaSubmit = async (data: UploadContentForm) => {
    if (!upload.videoFile)     { toast.error('Please select a video file');     return; }
    if (!upload.thumbnailFile) { toast.error('Please select a thumbnail image'); return; }

    setUpload(s => ({ ...s, uploading: true }));
    try {
      // 1. Create content record → get upload URL
      const { contentId: id, uploadUrl } = await contentApi.create({
        ...data,
        castList: data.castList.split(',').map(s => s.trim()),
        fileType: upload.videoFile!.type,
        fileSize: upload.videoFile!.size,
      });
      setContentId(id);

      // 2. Upload video directly to S3 pre-signed URL
      await uploadToS3(uploadUrl, upload.videoFile!, progress =>
        setUpload(s => ({ ...s, videoProgress: progress }))
      );

      // 3. Upload thumbnail
      const thumbUrl = await contentApi.getThumbUploadUrl(id, upload.thumbnailFile!.type);
      await uploadToS3(thumbUrl, upload.thumbnailFile!, progress =>
        setUpload(s => ({ ...s, thumbProgress: progress }))
      );

      setStep('done');
      toast.success('Content submitted for review!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please try again.');
    } finally {
      setUpload(s => ({ ...s, uploading: false }));
    }
  };

  const uploadToS3 = (url: string, file: File, onProgress: (pct: number) => void): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

  const onFileDrop = useCallback((e: React.DragEvent, type: 'video' | 'thumb') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (type === 'video')  setUpload(s => ({ ...s, videoFile: file }));
    if (type === 'thumb')  setUpload(s => ({ ...s, thumbnailFile: file }));
  }, []);

  return (
    <div className="flex min-h-screen bg-av-bg">
      <ProducerSidebar active="upload" />

      <main className="flex-1 p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>Upload Content</h1>
          <p className="text-av-text-muted text-sm mt-1">Share your film with AlphaView TV audiences worldwide</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10">
          {(['details', 'media', 'review', 'done'] as Step[]).map((s, i) => {
            const done = ['details','media','review','done'].indexOf(step) > i;
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                  done ? 'bg-av-success text-white' : active ? 'text-white' : 'bg-av-surface text-av-text-dim'
                }`} style={active ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
                  {done ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-xs font-medium capitalize flex-1 ${active ? 'text-av-text' : 'text-av-text-dim'}`}>{s}</span>
                {i < 3 && <div className="w-8 h-px bg-av-border" />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Details ── */}
          {step === 'details' && (
            <motion.form key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onSubmit={handleSubmit(() => setStep('media'))} className="space-y-6">
              <div className="av-card p-6 space-y-5">

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Film Title *</label>
                  <input {...register('title')} placeholder="e.g. The King of Lagos" className="av-input" />
                  {errors.title && <p className="text-xs text-av-danger mt-1">{errors.title.message}</p>}
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-2 block">Content Type *</label>
                  <div className="flex gap-2">
                    {(['movie', 'series', 'documentary', 'short'] as const).map(t => (
                      <label key={t} className="flex-1">
                        <input {...register('type')} type="radio" value={t} className="sr-only peer" />
                        <div className="text-center px-2 py-2 rounded-av border border-av-border text-xs capitalize text-av-text-muted cursor-pointer transition-all peer-checked:border-av-purple peer-checked:text-av-purple-lt peer-checked:bg-av-surface">
                          {t}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Synopsis *</label>
                  <textarea {...register('description')} rows={4} placeholder="Describe your film in detail..." className="av-input resize-none" />
                  {errors.description && <p className="text-xs text-av-danger mt-1">{errors.description.message}</p>}
                </div>

                {/* Genre */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-2 block">Genres * (select up to 3)</label>
                  <Controller name="genre" control={control} render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => {
                        const selected = field.value.includes(g);
                        return (
                          <button key={g} type="button"
                            onClick={() => {
                              if (selected) field.onChange(field.value.filter((v: string) => v !== g));
                              else if (field.value.length < 3) field.onChange([...field.value, g]);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                              selected ? 'border-av-pink text-av-pink-lt bg-av-pink/10' : 'border-av-border text-av-text-muted hover:border-av-border-md'
                            }`}
                          >{g}</button>
                        );
                      })}
                    </div>
                  )} />
                  {errors.genre && <p className="text-xs text-av-danger mt-1">{errors.genre.message}</p>}
                </div>

                {/* Price + Age Rating row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Price (₦) *</label>
                    <input {...register('priceNgn', { valueAsNumber: true })} type="number" placeholder="1500" className="av-input font-mono" />
                    {errors.priceNgn && <p className="text-xs text-av-danger mt-1">{errors.priceNgn.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Age Rating *</label>
                    <select {...register('ageRating')} className="av-input">
                      <option value="">Select rating</option>
                      {AGE_RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.ageRating && <p className="text-xs text-av-danger mt-1">{errors.ageRating.message}</p>}
                  </div>
                </div>

                {/* Cast */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Cast (comma-separated) *</label>
                  <input {...register('castList')} placeholder="Ramsey Nouah, Kate Henshaw, Genevieve Nnaji" className="av-input" />
                  {errors.castList && <p className="text-xs text-av-danger mt-1">{errors.castList.message}</p>}
                </div>

                {/* Release date */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Release Date *</label>
                  <input {...register('releaseDate')} type="date" className="av-input" />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full">
                Continue to Media Upload →
              </button>
            </motion.form>
          )}

          {/* ── Step 2: Media ── */}
          {step === 'media' && (
            <motion.div key="media" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="av-card p-6 space-y-6">
                {/* Video upload */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-2 block">Film File * (MP4, MOV, MKV — max 50GB)</label>
                  <div
                    className={`border-2 border-dashed rounded-av-lg p-8 text-center transition-colors cursor-pointer ${
                      upload.videoFile ? 'border-av-purple bg-av-surface' : 'border-av-border hover:border-av-border-md'
                    }`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onFileDrop(e, 'video')}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
                      onChange={e => e.target.files?.[0] && setUpload(s => ({ ...s, videoFile: e.target.files![0] }))} />
                    {upload.videoFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <Film size={20} className="text-av-purple-lt" />
                        <span className="text-sm text-av-text font-medium">{upload.videoFile.name}</span>
                        <span className="text-xs text-av-text-muted">({(upload.videoFile.size / 1e9).toFixed(2)} GB)</span>
                        <button onClick={e => { e.stopPropagation(); setUpload(s => ({ ...s, videoFile: undefined })); }}
                          className="text-av-text-muted hover:text-av-danger"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <Film size={32} className="text-av-text-dim mx-auto mb-3" />
                        <p className="text-sm text-av-text-muted">Drag & drop your film file or <span className="text-av-purple-lt">browse</span></p>
                        <p className="text-xs text-av-text-dim mt-1">MP4, MOV, MKV · Max 50 GB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Thumbnail upload */}
                <div>
                  <label className="text-xs font-medium text-av-text-muted mb-2 block">Cover Thumbnail * (JPG, PNG — 2:3 ratio recommended)</label>
                  <div
                    className={`border-2 border-dashed rounded-av-lg p-6 text-center transition-colors cursor-pointer ${
                      upload.thumbnailFile ? 'border-av-purple bg-av-surface' : 'border-av-border hover:border-av-border-md'
                    }`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onFileDrop(e, 'thumb')}
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    <input ref={thumbInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && setUpload(s => ({ ...s, thumbnailFile: e.target.files![0] }))} />
                    {upload.thumbnailFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <Image size={16} className="text-av-purple-lt" />
                        <span className="text-sm text-av-text">{upload.thumbnailFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Image size={24} className="text-av-text-dim mx-auto mb-2" />
                        <p className="text-sm text-av-text-muted">Upload cover image</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('details')} className="btn-secondary flex-1">← Back</button>
                <button onClick={() => setStep('review')} disabled={!upload.videoFile || !upload.thumbnailFile}
                  className="btn-primary flex-1 disabled:opacity-60">
                  Review & Submit →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="av-card p-6 mb-6">
                <h3 className="font-semibold text-av-text mb-4">Review before submitting</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3 items-center text-av-text-muted">
                    <CheckCircle size={15} className="text-av-success flex-shrink-0" />
                    Video file: <span className="text-av-text">{upload.videoFile?.name}</span>
                  </div>
                  <div className="flex gap-3 items-center text-av-text-muted">
                    <CheckCircle size={15} className="text-av-success flex-shrink-0" />
                    Thumbnail: <span className="text-av-text">{upload.thumbnailFile?.name}</span>
                  </div>
                  <div className="flex gap-3 items-start text-av-text-muted">
                    <AlertCircle size={15} className="text-av-warning flex-shrink-0 mt-0.5" />
                    <span>After submission, AlphaView TV will transcode your film (15–45 min) and route it for admin review. You'll be notified once it goes live.</span>
                  </div>
                </div>
              </div>

              {upload.uploading && (
                <div className="av-card p-4 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader size={16} className="text-av-purple-lt animate-spin" />
                    <span className="text-sm text-av-text">Uploading...</span>
                  </div>
                  <div className="space-y-2">
                    {[['Video', upload.videoProgress], ['Thumbnail', upload.thumbProgress]].map(([label, pct]) => (
                      <div key={label as string}>
                        <div className="flex justify-between text-xs text-av-text-muted mb-1">
                          <span>{label}</span><span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-av-elevated rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#d946ef)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('media')} disabled={upload.uploading} className="btn-secondary flex-1">← Back</button>
                <button onClick={handleSubmit(onMetaSubmit)} disabled={upload.uploading} className="btn-primary flex-1 disabled:opacity-60">
                  {upload.uploading ? 'Uploading...' : '🚀 Submit for Review'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-6xl mb-6">🎬</motion.div>
              <h2 className="font-display text-3xl text-white mb-3">Submitted!</h2>
              <p className="text-av-text-muted text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Your film is being processed. Our team will review it within 24 hours.
                You'll receive an email and SMS once it's live.
              </p>
              <div className="flex gap-3 justify-center">
                <a href="/producer/dashboard" className="btn-primary">← Dashboard</a>
                <button onClick={() => { setStep('details'); setUpload({ videoProgress: 0, thumbProgress: 0, uploading: false }); }}
                  className="btn-secondary">Upload Another</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
