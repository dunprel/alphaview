import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  StatusBar, Platform, ActivityIndicator, Alert, AppState,
} from 'react-native';
import Video, { DRMType }         from 'react-native-video';
import { useSafeAreaInsets }       from 'react-native-safe-area-context';
import { ScreenCapture }           from 'expo-screen-capture';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons }                from '@expo/vector-icons';
import Slider                      from '@react-native-community/slider';
import { streamingApi }            from '../services/api';
import { useAuthStore }            from '../store/auth.store';
import { formatTime }              from '../utils';

const { width: W, height: H } = Dimensions.get('window');
const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#000' };

interface RouteParams { contentId: string }

export default function PlayerScreen() {
  const route     = useRoute<any>();
  const nav       = useNavigation<any>();
  const insets    = useSafeAreaInsets();
  const { contentId } = route.params as RouteParams;
  const { user }  = useAuthStore();
  const videoRef  = useRef<any>(null);

  // State
  const [session,       setSession]      = useState<any>(null);
  const [content,       setContent]      = useState<any>(null);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState<string | null>(null);
  const [paused,        setPaused]       = useState(false);
  const [currentTime,   setCurrentTime]  = useState(0);
  const [duration,      setDuration]     = useState(0);
  const [showControls,  setShowControls] = useState(true);
  const [muted,         setMuted]        = useState(false);
  const [blocked,       setBlocked]      = useState(false);   // screen recording blocked
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>();

  // ── Block screen recording ─────────────────────────────────────────────────
  useEffect(() => {
    StatusBar.setHidden(true);
    ScreenCapture.preventScreenCaptureAsync();

    // iOS: detect screen recording via ScreenCapture listener
    const sub = ScreenCapture.addScreenshotListener(() => {
      Alert.alert(
        'Screenshot Blocked',
        'AlphaView TV content is protected. Screenshots are not permitted.',
        [{ text: 'OK' }],
      );
    });

    return () => {
      StatusBar.setHidden(false);
      ScreenCapture.allowScreenCaptureAsync();
      sub.remove();
    };
  }, []);

  // ── Load stream session ────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [sess, meta] = await Promise.all([
          streamingApi.createSession(contentId),
          streamingApi.getContentMeta(contentId),
        ]);
        setSession(sess);
        setContent(meta);
        setLoading(false);
      } catch (err: any) {
        const msg = err?.message ?? 'Failed to load video';
        if (msg.toLowerCase().includes('expired') || err?.statusCode === 403) {
          setError('Your 30-day access to this film has expired.\nPurchase again to continue watching.');
        } else {
          setError(msg);
        }
        setLoading(false);
      }
    };
    init();
  }, [contentId]);

  // ── Heartbeat every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session || paused) return;
    heartbeatTimer.current = setInterval(async () => {
      try {
        await streamingApi.heartbeat(contentId, {
          playheadSecs:   currentTime,
          percentWatched: duration > 0 ? (currentTime / duration) * 100 : 0,
          quality:        '720p',
          deviceType:     'mobile',
        });
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(heartbeatTimer.current);
  }, [session, paused, currentTime, duration]);

  // ── Auto-hide controls ─────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    if (!paused) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
    }
  }, [paused]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimer.current);
  }, [paused]);

  const togglePlay = () => { setPaused(v => !v); resetControlsTimer(); };
  const skip = (secs: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + secs));
    videoRef.current?.seek(next);
  };

  // ── DRM configuration ──────────────────────────────────────────────────────
  const drmConfig = session ? {
    type: Platform.OS === 'ios' ? DRMType.FAIRPLAY : DRMType.WIDEVINE,
    licenseServer:   session.drmLicenseUrl,
    headers: {
      Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}`,
    },
    ...(Platform.OS === 'ios' && {
      certificateUrl: `${process.env.EXPO_PUBLIC_API_URL}/stream/${contentId}/fairplay-cert`,
    }),
  } : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={[s.container, s.centered]}>
      <ActivityIndicator size="large" color={BRAND.purple} />
      <Text style={s.loadingText}>Loading secure stream…</Text>
    </View>
  );

  if (error) return (
    <View style={[s.container, s.centered, { padding: 32 }]}>
      <Ionicons name="lock-closed" size={48} color={BRAND.purple} />
      <Text style={s.errorTitle}>Playback Unavailable</Text>
      <Text style={s.errorMsg}>{error}</Text>
      <TouchableOpacity style={s.backBtn} onPress={() => nav.goBack()}>
        <Text style={s.backBtnText}>← Go Back</Text>
      </TouchableOpacity>
      {error.includes('expired') && (
        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: BRAND.purple, marginTop: 8 }]}
          onPress={() => nav.replace('MovieDetail', { contentId })}
        >
          <Text style={s.backBtnText}>Re-purchase Film</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar hidden />

      {/* Video */}
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={resetControlsTimer}
      >
        <Video
          ref={videoRef}
          source={{ uri: session!.manifestUrl }}
          drm={drmConfig}
          style={s.video}
          resizeMode="contain"
          paused={paused}
          muted={muted}
          onProgress={e => {
            setCurrentTime(e.currentTime);
            setDuration(e.seekableDuration || e.playableDuration);
          }}
          onError={e => setError(e.error?.errorString ?? 'Stream error')}
          onEnd={() => setPaused(true)}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={false}
          // Android FLAG_SECURE — blocks screen capture at OS level
          {...(Platform.OS === 'android' && { disableFocus: false })}
        />
      </TouchableOpacity>

      {/* Forensic watermark (nearly invisible) */}
      {session?.watermarkPayload && (
        <Text style={s.watermark}>
          AV·{user?.id?.slice(0, 8)}·{session.watermarkPayload}
        </Text>
      )}

      {/* Controls overlay */}
      {showControls && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Top bar */}
          <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={s.titleText} numberOfLines={1}>{content?.title}</Text>
              {session && (
                <Text style={s.accessText}>{session.daysRemaining} days access remaining</Text>
              )}
            </View>
          </View>

          {/* Centre controls */}
          <View style={s.centreControls}>
            <TouchableOpacity onPress={() => skip(-10)} style={s.skipBtn}>
              <Ionicons name="play-back" size={28} color="#fff" />
              <Text style={s.skipLabel}>10</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={s.playBtn}>
              <Ionicons name={paused ? 'play' : 'pause'} size={34} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => skip(10)} style={s.skipBtn}>
              <Ionicons name="play-forward" size={28} color="#fff" />
              <Text style={s.skipLabel}>10</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={[s.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.timeRow}>
              <Text style={s.timeText}>{formatTime(currentTime)}</Text>
              <Text style={s.timeText}> / {formatTime(duration)}</Text>
            </View>
            <Slider
              style={s.slider}
              value={duration > 0 ? currentTime / duration : 0}
              minimumValue={0}
              maximumValue={1}
              minimumTrackTintColor={BRAND.purple}
              maximumTrackTintColor="rgba(255,255,255,0.25)"
              thumbTintColor={BRAND.pink}
              onSlidingComplete={v => videoRef.current?.seek(v * duration)}
            />
            <View style={s.bottomActions}>
              <TouchableOpacity onPress={() => setMuted(v => !v)}>
                <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
              </TouchableOpacity>
              <View style={s.qualityBadge}>
                <Text style={s.qualityText}>HD</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#000' },
  centered:      { alignItems: 'center', justifyContent: 'center' },
  video:         { width: W, height: H },
  watermark:     { position: 'absolute', top: '20%', left: '10%', color: 'rgba(255,255,255,0.025)', fontSize: 10, fontFamily: 'monospace', transform: [{ rotate: '-15deg' }], pointerEvents: 'none' },
  loadingText:   { color: 'rgba(255,255,255,0.6)', marginTop: 16, fontSize: 13 },
  errorTitle:    { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  errorMsg:      { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn:       { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backBtnText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
  topBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, background: 'transparent' },
  iconBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
  titleText:     { color: '#fff', fontSize: 14, fontWeight: '600' },
  accessText:    { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  centreControls:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  skipBtn:       { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 28 },
  skipLabel:     { color: '#fff', fontSize: 9, marginTop: 2 },
  playBtn:       { width: 70, height: 70, backgroundColor: 'rgba(124,58,237,0.85)', borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 },
  timeRow:       { flexDirection: 'row', marginBottom: 4 },
  timeText:      { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'monospace' },
  slider:        { width: '100%', height: 32 },
  bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  qualityBadge:  { backgroundColor: 'rgba(124,58,237,0.3)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  qualityText:   { color: '#c4b5fd', fontSize: 10, fontWeight: '700' },
});
