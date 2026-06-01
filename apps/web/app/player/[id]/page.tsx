'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, ArrowLeft, Download,
  AlertCircle, Lock,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Logo from '@/components/ui/Logo';
import { streamingApi } from '@/lib/api/streaming';
import { formatTime } from '@/lib/utils';
import type { StreamSession, Content } from '@/types';

/* ── Dynamically import Shaka Player (browser-only) ── */
let shakaImported: typeof import('shaka-player/dist/shaka-player.compiled') | null = null;

export default function PlayerPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();

  // Refs
  const videoRef      = useRef<HTMLVideoElement>(null);
  const playerRef     = useRef<any>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  // State
  const [session,       setSession]       = useState<StreamSession | null>(null);
  const [content,       setContent]       = useState<Pick<Content, 'id' | 'title' | 'durationMins' | 'thumbnailUrl'> | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [playing,       setPlaying]       = useState(false);
  const [muted,         setMuted]         = useState(false);
  const [volume,        setVolume]        = useState(1);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [duration,      setDuration]      = useState(0);
  const [buffered,      setBuffered]      = useState(0);
  const [fullscreen,    setFullscreen]    = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [quality,       setQuality]       = useState('Auto');
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [drmBlocked,    setDrmBlocked]    = useState(false);

  // ── Init player ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        // 1. Get stream session (verifies purchase + 30-day window)
        const [sess, cont] = await Promise.all([
          streamingApi.createSession(id),
          streamingApi.getContentMeta(id),
        ]);
        if (!active) return;
        setSession(sess);
        setContent(cont);

        // 2. Load Shaka Player
        if (!shakaImported) {
          shakaImported = await import('shaka-player/dist/shaka-player.compiled' as any);
        }
        const shaka = shakaImported as any;
        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          throw new Error('Your browser does not support DRM-protected streaming.');
        }

        const player = new shaka.Player(videoRef.current);
        playerRef.current = player;

        // 3. Configure DRM
        player.configure({
          drm: {
            servers: {
              'com.widevine.alpha':  sess.drmLicenseUrl,
              'com.apple.fps.1_0':   sess.drmLicenseUrl,
              'com.microsoft.playready': sess.drmLicenseUrl,
            },
          },
          streaming: {
            bufferingGoal:  60,
            rebufferingGoal: 2,
            jumpLargeGaps:  true,
          },
          abr: {
            enabled: true,
            defaultBandwidthEstimate: 1_000_000,
          },
        });

        // 4. Attach auth header to DRM license requests
        player.getNetworkingEngine().registerRequestFilter((_type: any, req: any) => {
          if (_type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
            const token = document.cookie.match(/accessToken=([^;]+)/)?.[1];
            if (token) req.headers['Authorization'] = `Bearer ${token}`;
          }
        });

        // 5. Error handler
        player.addEventListener('error', (e: any) => {
          console.error('Shaka error', e.detail);
          setError('Stream error. Please try again.');
        });

        // 6. Load manifest
        await player.load(sess.manifestUrl);
        if (!active) return;
        setLoading(false);
        videoRef.current?.play();

      } catch (err: any) {
        if (!active) return;
        if (err.statusCode === 403) {
          setError('Your 30-day access to this film has expired. Purchase again to continue watching.');
        } else {
          setError(err.message || 'Failed to load video. Please try again.');
        }
        setLoading(false);
      }
    };

    init();
    return () => {
      active = false;
      playerRef.current?.destroy();
    };
  }, [id]);

  // ── Video event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onDurationChange = () => setDuration(video.duration);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener('timeupdate',    onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play',          onPlay);
    video.addEventListener('pause',         onPause);
    return () => {
      video.removeEventListener('timeupdate',    onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play',          onPlay);
      video.removeEventListener('pause',         onPause);
    };
  }, []);

  // ── Heartbeat every 30s ──────────────────────────────────────────────────
  useEffect(() => {
    if (!session || !playing) return;
    const interval = setInterval(async () => {
      try {
        await streamingApi.heartbeat(id, {
          playheadSecs:   currentTime,
          percentWatched: duration > 0 ? (currentTime / duration) * 100 : 0,
          quality,
          deviceType:     'web',
        });
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [session, playing, id, currentTime, duration, quality]);

  // ── Auto-hide controls ───────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(controlsTimer.current);
    if (playing) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 3500);
    }
  }, [playing]);

  // ── Controls ─────────────────────────────────────────────────────────────
  const togglePlay = () => playing ? videoRef.current?.pause() : videoRef.current?.play();
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(v => !v);
  };
  const seek = (pct: number) => {
    if (!videoRef.current || !duration) return;
    videoRef.current.currentTime = pct * duration;
  };
  const skip = (secs: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + secs));
  };
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* ── Top bar ── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-30 flex items-center gap-4 px-6 py-4"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}
          >
            <button onClick={() => router.back()} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">{content?.title}</div>
              {session && (
                <div className="text-white/50 text-xs">{session.daysRemaining} days of access remaining</div>
              )}
            </div>
            <Logo variant="icon" size="sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Video container ── */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center bg-black cursor-none"
        onMouseMove={showControls}
        onClick={togglePlay}
        style={{ cursor: controlsVisible ? 'default' : 'none' }}
      >
        {/* Video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
        />

        {/* Loading spinner */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-av-border border-t-av-purple rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Loading secure stream...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-av-danger/20 flex items-center justify-center mx-auto mb-4">
                {error.includes('expired') ? <Lock size={28} className="text-av-danger" /> : <AlertCircle size={28} className="text-av-danger" />}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Playback Unavailable</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                {error.includes('expired') && (
                  <Link href={`/movies/${id}`} className="btn-primary text-sm">Re-purchase Film</Link>
                )}
                <button onClick={() => router.back()} className="btn-secondary text-sm">← Go Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Invisible watermark (session-level) */}
        {session && (
          <div
            className="absolute pointer-events-none select-none"
            style={{
              top:      '15%',
              left:     '10%',
              color:    'rgba(255,255,255,0.03)',
              fontSize: '11px',
              fontFamily: 'monospace',
              transform: 'rotate(-15deg)',
            }}
          >
            AV-{session.watermarkPayload}
          </div>
        )}

        {/* Centre play/pause feedback */}
        <AnimatePresence>
          {!loading && !error && (
            <motion.button
              key={playing ? 'play' : 'pause'}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: controlsVisible ? 0 : 0 }}
              className="absolute"
              onClick={e => { e.stopPropagation(); togglePlay(); }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom controls ── */}
      <AnimatePresence>
        {controlsVisible && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-30 px-6 pb-6 pt-16"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}
          >
            {/* Progress bar */}
            <div className="mb-4 group cursor-pointer" onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek((e.clientX - rect.left) / rect.width);
            }}>
              <div className="relative h-1 bg-white/20 rounded-full group-hover:h-1.5 transition-all">
                {/* Buffered */}
                <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full"
                  style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
                {/* Played */}
                <div className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    background: 'linear-gradient(90deg,#7c3aed,#d946ef)',
                  }} />
                {/* Thumb */}
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%,-50%)' }} />
              </div>
            </div>

            {/* Control row */}
            <div className="flex items-center gap-3">
              {/* Skip back */}
              <button onClick={() => skip(-10)} className="text-white/70 hover:text-white transition-colors">
                <SkipBack size={20} />
              </button>

              {/* Play/Pause */}
              <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                {playing ? <Pause size={22} /> : <Play size={22} fill="white" />}
              </button>

              {/* Skip forward */}
              <button onClick={() => skip(10)} className="text-white/70 hover:text-white transition-colors">
                <SkipForward size={20} />
              </button>

              {/* Volume */}
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {/* Time */}
              <div className="text-white/70 text-xs font-mono ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="flex-1" />

              {/* Quality badge */}
              <div className="av-badge-purple text-[10px]">{quality}</div>

              {/* Settings */}
              <button onClick={() => setSettingsOpen(v => !v)} className="text-white/70 hover:text-white transition-colors">
                <Settings size={18} />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
                {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
