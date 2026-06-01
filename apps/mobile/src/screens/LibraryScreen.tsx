// ═══════════════════════════════════════════════════════
//  LibraryScreen.tsx
// ═══════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient }          from 'expo-linear-gradient';
import FastImage                   from 'react-native-fast-image';
import { useSafeAreaInsets }       from 'react-native-safe-area-context';
import { useNavigation }           from '@react-navigation/native';
import { Ionicons }                from '@expo/vector-icons';
import { purchasesApi }            from '../services/api';
import { formatNgn }               from '../utils';

const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export function LibraryScreen() {
  const [purchases,  setPurchases]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<'active' | 'expired'>('active');
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await purchasesApi.getLibrary();
      setPurchases(data);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = purchases.filter(p =>
    tab === 'active'
      ? p.status === 'active' && new Date(p.expiresAt) > new Date()
      : p.status === 'expired' || new Date(p.expiresAt) <= new Date()
  );

  const renderItem = ({ item }: { item: any }) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 86400000));
    const isActive = item.status === 'active' && daysLeft > 0;
    return (
      <TouchableOpacity
        style={ls.card}
        onPress={() => nav.navigate(isActive ? 'Player' : 'MovieDetail', { contentId: item.contentId })}
      >
        <View style={ls.thumb}>
          <FastImage source={{ uri: item.content?.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(8,5,16,0.9)']} style={ls.thumbGrad} />
          {!isActive && (
            <View style={ls.expiredOverlay}>
              <Ionicons name="lock-closed" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          )}
        </View>
        <View style={ls.cardInfo}>
          <Text style={ls.cardTitle} numberOfLines={2}>{item.content?.title}</Text>
          <Text style={ls.cardGenre}>{item.content?.genre?.[0]}</Text>
          <View style={ls.cardFooter}>
            {isActive
              ? <View style={ls.activeBadge}><Text style={ls.activeBadgeText}>{daysLeft}d left</Text></View>
              : <View style={ls.expiredBadge}><Text style={ls.expiredBadgeText}>Expired</Text></View>
            }
            {!isActive && (
              <TouchableOpacity
                style={ls.rebuyBtn}
                onPress={() => nav.navigate('MovieDetail', { contentId: item.contentId })}
              >
                <Text style={ls.rebuyText}>Re-buy {formatNgn(item.content?.priceNgn ?? 0)}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[ls.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Text style={ls.heading}>My Library</Text>
      <View style={ls.tabs}>
        {(['active', 'expired'] as const).map(t => (
          <TouchableOpacity key={t} style={[ls.tab, tab === t && ls.tabActive]} onPress={() => setTab(t)}>
            <Text style={[ls.tabText, tab === t && ls.tabTextActive]}>{t === 'active' ? 'Active' : 'Expired'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading
        ? <ActivityIndicator color={BRAND.purple} style={{ marginTop: 40 }} />
        : filtered.length === 0
        ? (
          <View style={ls.empty}>
            <Ionicons name="library-outline" size={48} color={BRAND.purple} />
            <Text style={ls.emptyTitle}>{tab === 'active' ? 'No active films' : 'No expired films'}</Text>
            <Text style={ls.emptySubtitle}>{tab === 'active' ? 'Purchase a film to get 30-day access' : 'Films you\'ve watched before appear here'}</Text>
          </View>
        )
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={BRAND.purple} />}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          />
        )
      }
    </View>
  );
}

const ls = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BRAND.bg },
  heading:         { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  tabs:            { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: BRAND.surface, borderRadius: 10, overflow: 'hidden' },
  tab:             { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:       { backgroundColor: BRAND.purple },
  tabText:         { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  tabTextActive:   { color: '#fff' },
  card:            { flexDirection: 'row', backgroundColor: BRAND.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,60,247,0.15)' },
  thumb:           { width: 90, height: 130 },
  thumbGrad:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 },
  expiredOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  cardInfo:        { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTitle:       { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  cardGenre:       { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  activeBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  activeBadgeText: { color: '#86efac', fontSize: 11, fontWeight: '600' },
  expiredBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  expiredBadgeText:{ color: '#fca5a5', fontSize: 11, fontWeight: '600' },
  rebuyBtn:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: BRAND.purple },
  rebuyText:       { color: '#fff', fontSize: 11, fontWeight: '600' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:      { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptySubtitle:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

export default LibraryScreen;
