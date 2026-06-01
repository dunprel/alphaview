import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient }          from 'expo-linear-gradient';
import FastImage                   from 'react-native-fast-image';
import { useSafeAreaInsets }       from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons }                from '@expo/vector-icons';
import { contentApi, purchasesApi } from '../services/api';
import { formatNgn, formatDuration } from '../utils';
import { useAuthStore }            from '../store/auth.store';

const { width: W } = Dimensions.get('window');
const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export default function MovieDetailScreen() {
  const route  = useRoute<any>();
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { contentId } = route.params as { contentId: string };
  const { user } = useAuthStore();

  const [content,  setContent]  = useState<any>(null);
  const [access,   setAccess]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [buying,   setBuying]   = useState(false);

  useEffect(() => {
    Promise.all([
      contentApi.getById(contentId),
      user ? purchasesApi.getAccessStatus(contentId) : Promise.resolve(null),
    ]).then(([c, a]) => {
      setContent(c);
      setAccess(a);
    }).finally(() => setLoading(false));
  }, [contentId, user]);

  const handleBuy = async () => {
    if (!user) { nav.navigate('Auth'); return; }
    if (access?.hasAccess) { nav.navigate('Player', { contentId }); return; }

    setBuying(true);
    try {
      const { checkoutUrl } = await purchasesApi.initiate(contentId);
      // In production: open Paystack WebView
      Alert.alert(
        'Purchase',
        `Open payment for ${formatNgn(content.priceNgn)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay Now',
            onPress: async () => {
              // Navigate to Paystack WebView screen
              nav.navigate('PaystackWebView', { url: checkoutUrl, contentId });
            },
          },
        ],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  };

  if (loading) return (
    <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator size="large" color={BRAND.purple} />
    </View>
  );

  if (!content) return null;
  const hasAccess  = access?.hasAccess;
  const daysLeft   = access?.daysRemaining ?? 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── Hero poster ── */}
        <View style={{ height: W * 1.3 }}>
          <FastImage
            source={{ uri: content.thumbnailUrl, priority: FastImage.priority.high }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(8,5,16,0.8)', '#080510']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Back btn */}
          <TouchableOpacity
            style={[s.backBtn, { top: insets.top + 12 }]}
            onPress={() => nav.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Hero text */}
          <View style={s.heroContent}>
            {/* Genres */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {content.genre?.map((g: string) => (
                  <View key={g} style={s.genreBadge}>
                    <Text style={s.genreText}>{g}</Text>
                  </View>
                ))}
                <View style={[s.genreBadge, { borderColor: 'rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <Text style={[s.genreText, { color: '#fcd34d' }]}>{content.ageRating}</Text>
                </View>
              </View>
            </ScrollView>

            <Text style={s.title}>{content.title}</Text>

            {/* Meta row */}
            <View style={s.metaRow}>
              {content.avgRating > 0 && (
                <View style={s.metaItem}>
                  <Ionicons name="star" size={13} color="#facc15" />
                  <Text style={s.metaText}>{content.avgRating.toFixed(1)}</Text>
                </View>
              )}
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>{formatDuration(content.durationMins)}</Text>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>{new Date(content.releaseDate).getFullYear()}</Text>
            </View>

            {/* CTA */}
            <View style={s.ctaRow}>
              {hasAccess ? (
                <>
                  <TouchableOpacity
                    style={s.watchBtn}
                    onPress={() => nav.navigate('Player', { contentId })}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={s.watchBtnText}>Watch Now</Text>
                  </TouchableOpacity>
                  <View style={s.accessBadge}>
                    <Text style={s.accessText}>✓ {daysLeft}d left</Text>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={[s.watchBtn, buying && { opacity: 0.6 }]}
                  onPress={handleBuy}
                  disabled={buying}
                >
                  <Ionicons name="cart" size={18} color="#fff" />
                  <Text style={s.watchBtnText}>
                    {buying ? 'Processing…' : `Buy — ${formatNgn(content.priceNgn)}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Info section ── */}
        <View style={s.infoSection}>
          {/* Description */}
          <Text style={s.sectionLabel}>Synopsis</Text>
          <Text style={s.description}>{content.description}</Text>

          {/* Cast */}
          {content.castList?.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={s.sectionLabel}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {content.castList.map((actor: string) => (
                    <View key={actor} style={s.castBadge}>
                      <Text style={s.castText}>{actor}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Producer card */}
          {content.producer && (
            <View style={{ marginTop: 24 }}>
              <Text style={s.sectionLabel}>Producer</Text>
              <TouchableOpacity
                style={s.producerCard}
                onPress={() => nav.navigate('ProducerProfile', { producerId: content.producer.id })}
              >
                <View style={s.producerAvatar}>
                  <Text style={s.producerAvatarText}>{content.producer.studioName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.producerName}>{content.producer.studioName}</Text>
                    {content.producer.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color={BRAND.purple} />
                    )}
                  </View>
                  <Text style={s.producerFollowers}>
                    {content.producer.followerCount?.toLocaleString()} followers
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Related */}
          {content.relatedContent?.length > 0 && (
            <View style={{ marginTop: 28 }}>
              <Text style={s.sectionLabel}>More Like This</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {content.relatedContent.slice(0, 8).map((c: any) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => nav.push('MovieDetail', { contentId: c.id })}
                    >
                      <View style={s.relatedCard}>
                        <FastImage source={{ uri: c.thumbnailUrl }} style={s.relatedThumb} resizeMode="cover" />
                        <LinearGradient colors={['transparent', 'rgba(8,5,16,0.9)']} style={s.relatedGrad} />
                        <View style={s.relatedInfo}>
                          <Text style={s.relatedTitle} numberOfLines={1}>{c.title}</Text>
                          <Text style={s.relatedPrice}>{formatNgn(c.priceNgn)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BRAND.bg },
  backBtn:            { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  heroContent:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  genreBadge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' },
  genreText:          { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  title:              { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34, marginBottom: 8 },
  metaRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  metaItem:           { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:           { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  metaDot:            { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
  ctaRow:             { flexDirection: 'row', alignItems: 'center', gap: 10 },
  watchBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12, backgroundColor: BRAND.purple },
  watchBtnText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
  accessBadge:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  accessText:         { color: '#86efac', fontSize: 12, fontWeight: '600' },
  infoSection:        { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel:       { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  description:        { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22 },
  castBadge:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BRAND.surface, borderWidth: 1, borderColor: 'rgba(139,60,247,0.2)' },
  castText:           { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  producerCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: BRAND.surface, borderWidth: 1, borderColor: 'rgba(139,60,247,0.2)', marginTop: 8 },
  producerAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND.card, alignItems: 'center', justifyContent: 'center' },
  producerAvatarText: { color: BRAND.purple, fontSize: 18, fontWeight: '800' },
  producerName:       { color: '#fff', fontSize: 14, fontWeight: '600' },
  producerFollowers:  { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  relatedCard:        { width: 120, height: 180, borderRadius: 10, overflow: 'hidden', backgroundColor: BRAND.card },
  relatedThumb:       { ...StyleSheet.absoluteFillObject },
  relatedGrad:        { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 },
  relatedInfo:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  relatedTitle:       { color: '#fff', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  relatedPrice:       { color: BRAND.pink, fontSize: 10, fontWeight: '700' },
});
