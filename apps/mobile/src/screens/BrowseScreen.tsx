// ═══════════════════════════════════════════════════════
//  BrowseScreen.tsx
// ═══════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import FastImage             from 'react-native-fast-image';
import { LinearGradient }   from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation }     from '@react-navigation/native';
import { contentApi }        from '../services/api';
import { formatNgn }         from '../utils';

const BRAND  = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };
const GENRES = ['All','Nollywood','Drama','Comedy','Action','Romance','Thriller','Documentary','Horror'];

export function BrowseScreen() {
  const [items,      setItems]      = useState<any[]>([]);
  const [genre,      setGenre]      = useState('');
  const [sort,       setSort]       = useState('trending');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [loadMore,   setLoadMore]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const load = useCallback(async (pg = 1, append = false) => {
    append ? setLoadMore(true) : setLoading(true);
    try {
      const res = await contentApi.browse({ page: pg, limit: 20, genre: genre || undefined, sort: sort as any });
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.meta.total);
      setPage(pg);
    } finally { setLoading(false); setLoadMore(false); setRefreshing(false); }
  }, [genre, sort]);

  useEffect(() => { load(1); }, [genre, sort]);

  const numCols = 2;
  const cardW   = (344 - 48) / numCols;  // approx screen width minus padding

  return (
    <View style={[bs.container, { paddingTop: insets.top }]}>
      <Text style={bs.heading}>Browse</Text>

      {/* Genre rail */}
      <FlatList
        horizontal data={GENRES} keyExtractor={g => g}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        renderItem={({ item: g }) => (
          <TouchableOpacity
            style={[bs.genreBtn, (g === 'All' ? !genre : genre === g) && bs.genreBtnActive]}
            onPress={() => setGenre(g === 'All' ? '' : g)}
          >
            <Text style={[bs.genreBtnText, (g === 'All' ? !genre : genre === g) && { color: '#fff' }]}>{g}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color={BRAND.purple} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          numColumns={numCols}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={BRAND.purple} />}
          onEndReached={() => { if (items.length < total && !loadMore) load(page + 1, true); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadMore ? <ActivityIndicator color={BRAND.purple} style={{ margin: 16 }} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[bs.card, { width: cardW }]}
              onPress={() => nav.navigate('MovieDetail', { contentId: item.id })}
              activeOpacity={0.8}
            >
              <View style={{ height: cardW * 1.5, borderRadius: 10, overflow: 'hidden' }}>
                <FastImage source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <LinearGradient colors={['transparent', 'rgba(8,5,16,0.95)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70 }} />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 }}>
                  <Text style={bs.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={bs.cardPrice}>{formatNgn(item.priceNgn)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const bs = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BRAND.bg },
  heading:        { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  genreBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BRAND.surface, borderWidth: 1, borderColor: 'rgba(139,60,247,0.2)' },
  genreBtnActive: { backgroundColor: BRAND.purple, borderColor: BRAND.purple },
  genreBtnText:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  card:           { flex: 1 },
  cardTitle:      { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardPrice:      { color: BRAND.pink, fontSize: 11, fontWeight: '800', marginTop: 2 },
});

// ═══════════════════════════════════════════════════════
//  DownloadsScreen.tsx
// ═══════════════════════════════════════════════════════
import React as RD, { useEffect as uED, useState as uSD } from 'react';
import {
  View as VD, Text as TD, FlatList as FLD, TouchableOpacity as TOD,
  StyleSheet as SSD, Alert as ALD,
} from 'react-native';
import { useSafeAreaInsets as uSAID } from 'react-native-safe-area-context';
import { useNavigation as uND }       from '@react-navigation/native';
import { Ionicons as ICD }            from '@expo/vector-icons';
import { DownloadManager }            from '../services/DownloadManager';
import { formatNgn as fN }            from '../utils';

export function DownloadsScreen() {
  const [downloads, setDownloads] = uSD<any[]>([]);
  const nav    = uND<any>();
  const insets = uSAID();

  uED(() => {
    const all = DownloadManager.getAllDownloads();
    setDownloads(all);
  }, []);

  const handleDelete = (contentId: string) => {
    ALD.alert('Delete Download', 'Remove this film from your downloads?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await DownloadManager.deleteDownload(contentId);
        setDownloads(prev => prev.filter(d => d.contentId !== contentId));
      }},
    ]);
  };

  return (
    <VD style={[dls.container, { paddingTop: insets.top }]}>
      <TD style={dls.heading}>Downloads</TD>
      <TD style={dls.sub}>Watch offline — available for 30 days from purchase</TD>

      {downloads.length === 0 ? (
        <VD style={dls.empty}>
          <ICD name="download-outline" size={48} color="#7c3aed" />
          <TD style={dls.emptyTitle}>No downloads yet</TD>
          <TD style={dls.emptySub}>Download films to watch without internet</TD>
          <TOD style={dls.browseBtn} onPress={() => nav.navigate('Browse')}>
            <TD style={dls.browseBtnText}>Browse Films</TD>
          </TOD>
        </VD>
      ) : (
        <FLD
          data={downloads}
          keyExtractor={i => i.contentId}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 86400000));
            const expired  = daysLeft === 0;
            return (
              <TOD
                style={[dls.item, expired && { opacity: 0.5 }]}
                onPress={() => !expired && nav.navigate('Player', { contentId: item.contentId, offline: true })}
              >
                <ICD name={expired ? 'lock-closed' : 'play-circle'} size={42} color={expired ? '#ef4444' : '#7c3aed'} />
                <VD style={{ flex: 1, marginLeft: 12 }}>
                  <TD style={dls.itemTitle} numberOfLines={1}>{item.title ?? item.contentId}</TD>
                  <TD style={dls.itemMeta}>{expired ? 'Access expired' : `${daysLeft} days remaining`}</TD>
                  <TD style={dls.itemSize}>{item.sizeMb ? `${item.sizeMb} MB` : 'Downloaded'}</TD>
                </VD>
                <TOD onPress={() => handleDelete(item.contentId)} style={dls.deleteBtn}>
                  <ICD name="trash-outline" size={18} color="rgba(255,255,255,0.3)" />
                </TOD>
              </TOD>
            );
          }}
        />
      )}
    </VD>
  );
}

const dls = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BRAND.bg },
  heading:      { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  sub:          { color: 'rgba(255,255,255,0.4)', fontSize: 12, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySub:     { color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' },
  browseBtn:    { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, backgroundColor: BRAND.purple },
  browseBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  item:         { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(139,60,247,0.15)' },
  itemTitle:    { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  itemMeta:     { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  itemSize:     { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 2 },
  deleteBtn:    { padding: 8 },
});

// ═══════════════════════════════════════════════════════
//  SearchScreen.tsx
// ═══════════════════════════════════════════════════════
import React as RS, { useState as uSS, useCallback as uCS } from 'react';
import {
  View as VS, Text as TS, TextInput as TIS, FlatList as FLS,
  TouchableOpacity as TOS, StyleSheet as SSS, ActivityIndicator as AIS,
} from 'react-native';
import FastImage as FIS                from 'react-native-fast-image';
import { useSafeAreaInsets as uSAIS } from 'react-native-safe-area-context';
import { useNavigation as uNS }        from '@react-navigation/native';
import { Ionicons as ICS }             from '@expo/vector-icons';
import { contentApi as cApiS }         from '../services/api';
import { formatNgn as fNS }            from '../utils';
import { debounce as dS }              from '../utils';

export function SearchScreen() {
  const [query,   setQuery]   = uSS('');
  const [results, setResults] = uSS<any[]>([]);
  const [loading, setLoading] = uSS(false);
  const nav    = uNS<any>();
  const insets = uSAIS();

  const search = uCS(dS(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await cApiS.search(q);
      setResults(data);
    } finally { setLoading(false); }
  }, 400), []);

  const handleChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  return (
    <VS style={[ss.container, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <VS style={ss.searchBar}>
        <ICS name="search-outline" size={20} color="rgba(255,255,255,0.3)" />
        <TIS
          style={ss.searchInput}
          placeholder="Search films, actors, producers…"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={query}
          onChangeText={handleChange}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TOS onPress={() => { setQuery(''); setResults([]); }}>
            <ICS name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
          </TOS>
        )}
      </VS>

      {loading && <AIS color={BRAND.purple} style={{ marginTop: 24 }} />}

      {!loading && query.length > 0 && results.length === 0 && (
        <VS style={ss.empty}>
          <TS style={ss.emptyText}>No results for "{query}"</TS>
        </VS>
      )}

      <FLS
        data={results}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <TOS
            style={ss.result}
            onPress={() => nav.navigate('MovieDetail', { contentId: item.id })}
          >
            <VS style={ss.resultThumb}>
              <FIS source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
            </VS>
            <VS style={{ flex: 1, marginLeft: 12 }}>
              <TS style={ss.resultTitle} numberOfLines={1}>{item.title}</TS>
              <TS style={ss.resultGenre}>{item.genre?.[0]} · {item.durationMins}m</TS>
              <TS style={ss.resultPrice}>{fNS(item.priceNgn)}</TS>
            </VS>
            <ICS name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TOS>
        )}
      />
    </VS>
  );
}

const ss = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BRAND.bg },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139,60,247,0.2)', paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },
  empty:       { alignItems: 'center', paddingTop: 40 },
  emptyText:   { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  result:      { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(139,60,247,0.1)' },
  resultThumb: { width: 54, height: 78, borderRadius: 8, overflow: 'hidden', backgroundColor: BRAND.surface },
  resultTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  resultGenre: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  resultPrice: { color: BRAND.pink, fontSize: 13, fontWeight: '700', marginTop: 4 },
});

export default SearchScreen;
