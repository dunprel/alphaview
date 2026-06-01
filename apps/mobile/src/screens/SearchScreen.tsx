import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Keyboard,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import FastImage             from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation }     from '@react-navigation/native';
import { Ionicons }          from '@expo/vector-icons';
import { MMKV }              from 'react-native-mmkv';
import { contentApi }        from '../services/api';
import { formatNgn }         from '../utils';

const BRAND   = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035', border: 'rgba(139,60,247,0.2)' };
const storage = new MMKV({ id: 'search-history' });

const MAX_HISTORY = 8;

function getHistory(): string[] {
  try { return JSON.parse(storage.getString('history') ?? '[]'); } catch { return []; }
}
function saveHistory(q: string) {
  const prev = getHistory().filter(h => h !== q);
  storage.set('history', JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
}

const SUGGESTIONS = ['Ramsey Nouah', 'Genevieve Nnaji', 'Nollywood 2024', 'Lagos drama', 'Kate Henshaw', 'Crime thriller'];

export default function SearchScreen() {
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [history,  setHistory]  = useState<string[]>(getHistory);

  const doSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    Keyboard.dismiss();
    try {
      const data = await contentApi.search(term);
      setResults(Array.isArray(data) ? data : data.data ?? []);
      setSearched(true);
      saveHistory(term);
      setHistory(getHistory());
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const clearHistory = () => {
    storage.delete('history');
    setHistory([]);
  };

  const handleClear = () => {
    setQuery(''); setResults([]); setSearched(false);
  };

  const renderResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={s.resultRow}
      onPress={() => nav.navigate('MovieDetail', { contentId: item.id })}
      activeOpacity={0.75}
    >
      <View style={s.resultThumb}>
        <FastImage source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <LinearGradient colors={['transparent', 'rgba(8,5,16,0.85)']} style={s.resultThumbGrad} />
      </View>
      <View style={s.resultInfo}>
        <Text style={s.resultTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.resultMeta}>{item.genre?.[0]} · {item.durationMins}m</Text>
        <Text style={s.resultPrice}>{formatNgn(item.priceNgn)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* Search bar */}
      <View style={s.searchRow}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.inputWrap}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.3)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query)}
            placeholder="Search films, actors, genres…"
            placeholderTextColor="rgba(255,255,255,0.22)"
            returnKeyType="search"
            autoFocus
            style={s.input}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={BRAND.purple} />
          <Text style={s.loadingText}>Searching…</Text>
        </View>
      )}

      {/* Pre-search: history + suggestions */}
      {!loading && !searched && (
        <FlatList
          data={[]}
          ListHeaderComponent={
            <View style={s.presearchContainer}>
              {/* Recent */}
              {history.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionTitle}>Recent</Text>
                    <TouchableOpacity onPress={clearHistory}>
                      <Text style={s.clearText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  {history.map(h => (
                    <TouchableOpacity key={h} style={s.historyRow}
                      onPress={() => { setQuery(h); doSearch(h); }}>
                      <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.3)" />
                      <Text style={s.historyText}>{h}</Text>
                      <TouchableOpacity onPress={() => {
                        const updated = history.filter(i => i !== h);
                        storage.set('history', JSON.stringify(updated));
                        setHistory(updated);
                      }}>
                        <Ionicons name="close" size={14} color="rgba(255,255,255,0.2)" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Suggestions */}
              <View>
                <Text style={s.sectionTitle}>Trending Searches</Text>
                <View style={s.pillRow}>
                  {SUGGESTIONS.map(sug => (
                    <TouchableOpacity key={sug} style={s.pill}
                      onPress={() => { setQuery(sug); doSearch(sug); }}>
                      <Text style={s.pillText}>{sug}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          }
          renderItem={null}
          keyExtractor={() => ''}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <View style={s.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={s.noResultTitle}>No results for "{query}"</Text>
          <Text style={s.noResultSub}>Try different keywords or browse by genre</Text>
        </View>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          <Text style={s.resultCount}>{results.length} film{results.length !== 1 ? 's' : ''} found</Text>
          <FlatList
            data={results}
            keyExtractor={i => i.id}
            renderItem={renderResult}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BRAND.bg },
  searchRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  inputWrap:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BRAND.border },
  input:              { flex: 1, color: '#fff', fontSize: 15 },
  centered:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText:        { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 13 },
  presearchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:       { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  clearText:          { color: '#a78bfa', fontSize: 12 },
  historyRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(139,60,247,0.07)' },
  historyText:        { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  pillRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pill:               { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.border },
  pillText:           { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  resultCount:        { color: 'rgba(255,255,255,0.3)', fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  resultRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(139,60,247,0.07)' },
  resultThumb:        { width: 54, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: BRAND.card },
  resultThumbGrad:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30 },
  resultInfo:         { flex: 1 },
  resultTitle:        { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  resultMeta:         { color: 'rgba(255,255,255,0.38)', fontSize: 12, marginBottom: 4 },
  resultPrice:        { color: BRAND.pink, fontSize: 12, fontWeight: '700' },
  noResultTitle:      { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  noResultSub:        { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
