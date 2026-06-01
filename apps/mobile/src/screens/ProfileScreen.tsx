// ═══════════════════════════════════════════════════════
//  ProfileScreen.tsx
// ═══════════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation }     from '@react-navigation/native';
import { Ionicons }          from '@expo/vector-icons';
import { useAuthStore }      from '../store/auth.store';

const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const MENU_ITEMS = [
    { icon: 'library-outline',      label: 'My Library',       onPress: () => nav.navigate('Library')  },
    { icon: 'download-outline',     label: 'Downloads',        onPress: () => nav.navigate('Downloads') },
    { icon: 'card-outline',         label: 'Payment History',  onPress: () => {}                        },
    { icon: 'notifications-outline',label: 'Notifications',    onPress: () => {}                        },
    { icon: 'settings-outline',     label: 'Settings',         onPress: () => {}                        },
    { icon: 'help-circle-outline',  label: 'Help & Support',   onPress: () => {}                        },
    { icon: 'shield-outline',       label: 'Privacy Policy',   onPress: () => {}                        },
  ];

  if (!user) return (
    <View style={[ps.container, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }]}>
      <Ionicons name="person-circle-outline" size={64} color={BRAND.purple} />
      <Text style={ps.heading}>Sign In to AlphaView TV</Text>
      <Text style={ps.subtitle}>Access your library and purchases</Text>
      <TouchableOpacity style={ps.signInBtn} onPress={() => nav.navigate('Auth')}>
        <Text style={ps.signInBtnText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={ps.container} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}>
      {/* Header */}
      <View style={ps.header}>
        <View style={ps.avatar}>
          <Text style={ps.avatarText}>{user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={ps.name}>{user.fullName}</Text>
        <Text style={ps.email}>{user.email}</Text>
        {user.role === 'producer' && (
          <TouchableOpacity style={ps.producerBtn} onPress={() => {}}>
            <Ionicons name="videocam" size={14} color="#fff" />
            <Text style={ps.producerBtnText}>Producer Studio</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu */}
      <View style={ps.menu}>
        {MENU_ITEMS.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={ps.menuItem} onPress={onPress}>
            <View style={ps.menuIconWrap}>
              <Ionicons name={icon as any} size={20} color={BRAND.purple} />
            </View>
            <Text style={ps.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        ))}
      </View>

      {/* App version */}
      <Text style={ps.version}>AlphaView TV v1.0.0</Text>

      {/* Sign out */}
      <TouchableOpacity style={ps.signOutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={ps.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  container:      { flex: 1, backgroundColor: BRAND.bg },
  header:         { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  avatar:         { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(217,70,239,0.4)' },
  avatarText:     { color: '#fff', fontSize: 28, fontWeight: '800' },
  name:           { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email:          { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12 },
  producerBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BRAND.purple },
  producerBtnText:{ color: '#fff', fontSize: 13, fontWeight: '600' },
  menu:           { marginHorizontal: 16, backgroundColor: BRAND.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,60,247,0.12)', marginBottom: 16 },
  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(139,60,247,0.08)' },
  menuIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.12)', alignItems: 'center', justifyContent: 'center' },
  menuLabel:      { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  version:        { color: 'rgba(255,255,255,0.2)', fontSize: 11, textAlign: 'center', marginBottom: 16 },
  signOutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  signOutText:    { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  heading:        { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  subtitle:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 },
  signInBtn:      { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: BRAND.purple },
  signInBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProfileScreen;
