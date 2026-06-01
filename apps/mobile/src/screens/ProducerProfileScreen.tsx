import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import FastImage             from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons }          from '@expo/vector-icons';
import { producerApi, contentApi } from '../services/api';
import { formatNgn }         from '../utils';
import { useAuthStore }      from '../store/auth.store';

const { width: W }  = Dimensions.get('window');
const CARD_W        = (W - 48) / 3;
const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export default function ProducerProfileScreen() {
  const nav    = useNavigation<any>();
  const route  = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { producerId } = route.params as { producerId: string };

  const [producer,   setProducer]   = useState<any>(null);
  const [content,    setContent]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [following,  setFollowing]  = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      producerApi.getProfile(producerId),
      contentApi.browse({ limit: 30 }).then(r => r.data?.filter((c: any) => c.producer?.id === producerId) ?? []),
    ]).then(([p, c]) => {
      setProducer(p);
      setContent(c);
    }).finally(() => setLoading(false));
  }, [producerId]);

  const toggleFollow = useCallback(async () => {
    if (!user) { nav.navigate('Auth'); return; }
    setFollowLoading(true);
    try {
      if (following) {
        await producerApi.unfollow(producerId);
        setFollowing(false);
        setProducer((p: any) => p ? { ...p, follower_count: (p.follower_count ?? 1) - 1 } : p);
      } else {
        await producerApi.follow(producerId);
        setFollowing(true);
        setProducer((p: any) => p ? { ...p, follower_count: (p.follower_count ?? 0) + 1 } : p);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Action failed');
    } finally { setFollowLoading(false); }
  }, [following, producerId, user]);

  if (loading) return (
    <View style={[s.container, s.centered]}>
      <ActivityIndicator size="large" color={BRAND.purple} />
    </View>
  );
  if (!producer) return null;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} bounces={false}>

      {/* Banner */}
      <View style={{ height: 180, position: 'relative' }}>
        {producer.banner_url ? (
          <FastImage source={{ uri: producer.banner_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#2e0a60', '#080510']} style={StyleSheet.absoluteFillObject} />
        )}
        <LinearGradient colors={['transparent', '#080510']} style={[StyleSheet.absoluteFillObject, { top: '50%' }]} />

        {/* Back button */}
        <TouchableOpacity
          style={[s.backBtn, { top: insets.top + 8 }]}
          onPress={() => nav.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Profile header */}
      <View style={s.profileHeader}>
        {/* Avatar */}
        <View style={s.avatarContainer}>
          <View style={s.avatar}>
            {producer.avatar_url ? (
              <FastImage source={{ uri: producer.avatar_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <Text style={s.avatarLetter}>{producer.studio_name?.[0]}</Text>
            )}
          </View>
          {producer.is_verified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark" size={11} color="#fff" />
            </View>
          )}
        </View>

        {/* Follow button */}
        <TouchableOpacity
          style={[s.followBtn, following && s.followingBtn]}
          onPress={toggleFollow}
          disabled={followLoading}
        >
          {followLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[s.followBtnText, following && s.followingBtnText]}>
                {following ? '✓ Following' : '+ Follow'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      {/* Studio info */}
      <View style={s.infoBlock}>
        <Text style={s.studioName}>{producer.studio_name}</Text>
        {producer.user?.full_name && (
          <Text style={s.ownerName}>{producer.user.full_name}</Text>
        )}
        {producer.bio && (
          <Text style={s.bio}>{producer.bio}</Text>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { value: (producer.follower_count ?? 0).toLocaleString(), label: 'Followers' },
            { value: (producer.content_count ?? content.length).toString(), label: 'Films' },
            { value: producer.avg_rating ? producer.avg_rating.toFixed(1) : '—', label: 'Avg Rating' },
          ].map(({ value, label }) => (
            <View key={label} style={s.statItem}>
              <Text style={s.statValue}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Content grid */}
      <View style={s.contentSection}>
        <Text style={s.contentHeading}>Films</Text>
        {content.length === 0 ? (
          <View style={s.emptyContent}>
            <Ionicons name="film-outline" size={36} color="rgba(124,58,237,0.4)" />
            <Text style={s.emptyText}>No films published yet</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {content.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={s.gridCard}
                onPress={() => nav.navigate('MovieDetail', { contentId: c.id })}
                activeOpacity={0.8}
              >
                <FastImage source={{ uri: c.thumbnailUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                <LinearGradient colors={['transparent', 'rgba(8,5,16,0.93)']} style={s.gridGrad} />
                <View style={s.gridInfo}>
                  <Text style={s.gridTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={s.gridPrice}>{formatNgn(c.priceNgn)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BRAND.bg },
  centered:         { alignItems: 'center', justifyContent: 'center' },
  backBtn:          { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  profileHeader:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: -40 },
  avatarContainer:  { position: 'relative' },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: BRAND.bg, overflow: 'hidden' },
  avatarLetter:     { color: '#fff', fontSize: 28, fontWeight: '900' },
  verifiedBadge:    { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BRAND.bg },
  followBtn:        { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 22, backgroundColor: BRAND.purple, marginBottom: 6 },
  followingBtn:     { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(139,60,247,0.5)' },
  followBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  followingBtnText: { color: '#a78bfa' },
  infoBlock:        { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  studioName:       { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 },
  ownerName:        { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 8 },
  bio:              { color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  statsRow:         { flexDirection: 'row', gap: 0 },
  statItem:         { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: BRAND.surface, borderRadius: 10, marginHorizontal: 3 },
  statValue:        { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel:        { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  divider:          { height: 1, backgroundColor: 'rgba(139,60,247,0.12)', marginHorizontal: 20 },
  contentSection:   { paddingHorizontal: 20, paddingTop: 20 },
  contentHeading:   { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  emptyContent:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyText:        { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCard:         { width: CARD_W, height: CARD_W * 1.5, borderRadius: 8, overflow: 'hidden', backgroundColor: BRAND.card },
  gridGrad:         { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  gridInfo:         { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6 },
  gridTitle:        { color: '#fff', fontSize: 10, fontWeight: '600', marginBottom: 1 },
  gridPrice:        { color: BRAND.pink, fontSize: 10, fontWeight: '700' },
});
