// ═══════════════════════════════════════════════════════
//  DownloadsScreen.tsx
// ═══════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import FastImage                   from 'react-native-fast-image';
import { useSafeAreaInsets }       from 'react-native-safe-area-context';
import { useNavigation }           from '@react-navigation/native';
import { Ionicons }                from '@expo/vector-icons';
import { downloadsApi }            from '../services/api';
import { getDaysRemaining }        from '../utils';

const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export function DownloadsScreen() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    downloadsApi.listDownloads()
      .then(setDownloads)
      .catch(() => setDownloads([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (item: any) => {
    Alert.alert(
      'Remove Download',
      `Remove "${item.content?.title}" from downloads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await downloadsApi.revokeLocal(item.contentId);
            setDownloads(prev => prev.filter(d => d.id !== item.id));
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const daysLeft = getDaysRemaining(item.expiresAt);
    const isValid  = !item.keyRevoked && daysLeft > 0;

    return (
      <View style={ds.card}>
        <View style={ds.thumb}>
          <FastImage source={{ uri: item.content?.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          {!isValid && (
            <View style={ds.expiredOverlay}>
              <Ionicons name="lock-closed" size={22} color="rgba(255,255,255,0.5)" />
            </View>
          )}
        </View>

        <View style={ds.info}>
          <Text style={ds.title} numberOfLines={2}>{item.content?.title}</Text>
          <View style={ds.meta}>
            {isValid
              ? <View style={ds.activeDot}><Text style={ds.activeDotText}>{daysLeft}d left</Text></View>
              : <View style={ds.expiredDot}><Text style={ds.expiredDotText}>Expired</Text></View>
            }
          </View>

          <View style={ds.actions}>
            {isValid && (
              <TouchableOpacity
                style={ds.playBtn}
                onPress={() => nav.navigate('Player', { contentId: item.contentId })}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={ds.playBtnText}>Play Offline</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={ds.deleteBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={16} color="rgba(239,68,68,0.7)" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[ds.container, { paddingTop: insets.top }]}>
      <Text style={ds.heading}>Downloads</Text>
      <Text style={ds.subheading}>Available offline · {downloads.length} file{downloads.length !== 1 ? 's' : ''}</Text>

      {loading
        ? <ActivityIndicator color={BRAND.purple} style={{ marginTop: 40 }} />
        : downloads.length === 0
        ? (
          <View style={ds.empty}>
            <Ionicons name="download-outline" size={52} color={BRAND.purple} />
            <Text style={ds.emptyTitle}>No downloads yet</Text>
            <Text style={ds.emptySubtitle}>Download films to watch without internet. Access is limited to your 30-day purchase window.</Text>
          </View>
        )
        : (
          <FlatList
            data={downloads}
            keyExtractor={i => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
          />
        )
      }
    </View>
  );
}

const ds = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BRAND.bg },
  heading:      { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  subheading:   { color: 'rgba(255,255,255,0.35)', fontSize: 13, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  card:         { flexDirection: 'row', backgroundColor: BRAND.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,60,247,0.15)' },
  thumb:        { width: 90, height: 130, backgroundColor: BRAND.surface },
  expiredOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  info:         { flex: 1, padding: 12, justifyContent: 'space-between' },
  title:        { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  meta:         { flexDirection: 'row', gap: 8, marginTop: 6 },
  activeDot:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  activeDotText:{ color: '#86efac', fontSize: 10, fontWeight: '600' },
  expiredDot:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  expiredDotText:{ color: '#fca5a5', fontSize: 10, fontWeight: '600' },
  actions:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  playBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: BRAND.purple },
  playBtnText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteBtn:    { width: 34, height: 34, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle:{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

export default DownloadsScreen;
