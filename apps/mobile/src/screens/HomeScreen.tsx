import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  ImageBackground, StyleSheet, Dimensions, StatusBar,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { contentApi }    from '../services/api';
import { formatNgn }     from '../utils';
import type { Content }  from '../types';

const { width: W } = Dimensions.get('window');
const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export default function HomeScreen() {
  const insets  = useSafeAreaInsets();
  const nav     = useNavigation<any>();
  const heroRef = useRef<FlatList>(null);

  const [data,         setData]         = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [heroIndex,    setHeroIndex]    = useState(0);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await contentApi.getHomeData();
      setData(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-advance hero carousel
  useEffect(() => {
    if (!data?.featured?.length) return;
    const t = setInterval(() => {
      setHeroIndex(i => {
        const next = (i + 1) % data.featured.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 6000);
    return () => clearInterval(t);
  }, [data?.featured?.length]);

  if (loading) return (
    <View style={[s.centered, { backgroundColor: BRAND.bg }]}>
      <ActivityIndicator size="large" color={BRAND.purple} />
    </View>
  );

  const featured: Content[] = data?.featured ?? [];
  const trending: Content[] = data?.trending  ?? [];
  const newRels:  Content[] = data?.newReleases ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={BRAND.purple}
          />
        }
      >
        {/* ── Hero Carousel ── */}
        <View style={{ height: W * 1.1, position: 'relative' }}>
          <FlatList
            ref={heroRef}
            data={featured}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={c => c.id}
            onMomentumScrollEnd={e => {
              setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / W));
            }}
            renderItem={({ item }) => (
              <View style={{ width: W, height: W * 1.1 }}>
                <FastImage
                  source={{ uri: item.thumbnailUrl, priority: FastImage.priority.high }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(8,5,16,0.7)', '#080510']}
                  style={StyleSheet.absoluteFillObject}
                />
                {/* Content overlay */}
                <View style={{ position: 'absolute', bottom: 80, left: 20, right: 20 }}>
                  <View style={s.featuredBadge}>
                    <Text style={s.featuredBadgeText}>✦ FEATURED</Text>
                  </View>
                  <Text style={s.heroTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.metaRow}>
                    {item.genre?.slice(0, 2).map((g: string) => (
                      <View key={g} style={s.genreBadge}>
                        <Text style={s.genreText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={s.heroDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={s.btnRow}>
                    <TouchableOpacity
                      style={s.watchBtn}
                      onPress={() => nav.navigate('Player', { contentId: item.id })}
                    >
                      <Ionicons name="play" size={16} color="#fff" />
                      <Text style={s.watchBtnText}>Watch Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.buyBtn}
                      onPress={() => nav.navigate('MovieDetail', { contentId: item.id })}
                    >
                      <Text style={s.buyBtnText}>{formatNgn(item.priceNgn)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />

          {/* Hero dots */}
          <View style={s.dotsRow}>
            {featured.map((_, i) => (
              <View key={i} style={[s.dot, i === heroIndex && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* ── Navigation header overlay ── */}
        <View style={[s.navBar, { paddingTop: insets.top + 8 }]}>
          <View style={s.logoArea}>
            <View style={s.logoIcon}>
              <Text style={s.logoLetter}>A</Text>
            </View>
            <View>
              <Text style={s.logoText}>AlphaView</Text>
              <Text style={s.logoSub}>TV</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => nav.navigate('Search')}>
            <Ionicons name="search" size={24} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* ── Content rows ── */}
        <View style={{ paddingBottom: 100 }}>
          <ContentRow title="🔥 Trending Now"   badge="HOT"   items={trending} nav={nav} />
          <ContentRow title="✨ New Releases"   badge="NEW"   items={newRels}  nav={nav} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Content row component ─────────────────────────────────────────────────────
function ContentRow({ title, badge, items, nav }: {
  title: string; badge: string; items: Content[]; nav: any;
}) {
  if (!items?.length) return null;
  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <View style={s.rowBadge}><Text style={s.rowBadgeText}>{badge}</Text></View>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingLeft: 16, gap: 12 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <MiniCard content={item} nav={nav} />}
      />
    </View>
  );
}

// ── Mini card ─────────────────────────────────────────────────────────────────
function MiniCard({ content, nav }: { content: Content; nav: any }) {
  return (
    <TouchableOpacity
      onPress={() => nav.navigate('MovieDetail', { contentId: content.id })}
      activeOpacity={0.8}
    >
      <View style={s.miniCard}>
        <FastImage
          source={{ uri: content.thumbnailUrl }}
          style={s.miniThumb}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(8,5,16,0.95)']}
          style={s.miniGradient}
        />
        <View style={s.miniInfo}>
          <Text style={s.miniTitle} numberOfLines={1}>{content.title}</Text>
          <Text style={s.miniPrice}>{formatNgn(content.priceNgn)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar:        { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  logoArea:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7c3aed' },
  logoLetter:    { color: '#fff', fontSize: 16, fontWeight: '900' },
  logoText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoSub:       { color: '#d946ef', fontSize: 9, fontWeight: '800', letterSpacing: 3 },
  featuredBadge: { backgroundColor: 'rgba(217,70,239,0.2)', borderWidth: 1, borderColor: 'rgba(217,70,239,0.4)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 },
  featuredBadgeText: { color: '#f0abfc', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  heroTitle:     { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 33, marginBottom: 8 },
  metaRow:       { flexDirection: 'row', gap: 6, marginBottom: 8 },
  genreBadge:    { backgroundColor: 'rgba(124,58,237,0.25)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  genreText:     { color: '#c4b5fd', fontSize: 10, fontWeight: '600' },
  heroDesc:      { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  btnRow:        { flexDirection: 'row', gap: 10 },
  watchBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#7c3aed' },
  watchBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  buyBtn:        { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(124,58,237,0.5)', backgroundColor: 'rgba(124,58,237,0.1)' },
  buyBtnText:    { color: '#c4b5fd', fontSize: 14, fontWeight: '700' },
  dotsRow:       { position: 'absolute', bottom: 90, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:     { width: 22, backgroundColor: '#d946ef' },
  rowTitle:      { color: '#f5f0ff', fontSize: 18, fontWeight: '700' },
  rowBadge:      { backgroundColor: 'rgba(217,70,239,0.15)', borderWidth: 1, borderColor: 'rgba(217,70,239,0.3)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  rowBadgeText:  { color: '#f0abfc', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  miniCard:      { width: 130, height: 195, borderRadius: 10, overflow: 'hidden', backgroundColor: BRAND.card },
  miniThumb:     { width: '100%', height: '100%', position: 'absolute' },
  miniGradient:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  miniInfo:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  miniTitle:     { color: '#fff', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  miniPrice:     { color: '#d946ef', fontSize: 11, fontWeight: '800' },
});
