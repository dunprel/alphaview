// ═══════════════════════════════════════════════════════
//  LoginScreen.tsx
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation }     from '@react-navigation/native';
import { Ionicons }          from '@expo/vector-icons';
import { useAuthStore }      from '../store/auth.store';

const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035' };

export function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, loading }      = useAuthStore();
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email.trim() || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Sign In Failed', err?.message || 'Invalid email or password');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={ls.container} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Background glow */}
        <View style={ls.glowTop} />
        <View style={ls.glowBottom} />

        <View style={[ls.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
          {/* Logo */}
          <View style={ls.logoRow}>
            <LinearGradient colors={['#7c3aed', '#d946ef']} style={ls.logoIcon}>
              <Text style={ls.logoLetter}>A</Text>
            </LinearGradient>
            <View>
              <Text style={ls.logoName}>AlphaView</Text>
              <Text style={ls.logoSub}>TV</Text>
            </View>
          </View>

          <Text style={ls.heading}>Welcome Back</Text>
          <Text style={ls.subheading}>Sign in to continue watching</Text>

          {/* Email */}
          <View style={ls.inputWrap}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.3)" style={ls.inputIcon} />
            <TextInput
              style={ls.input}
              placeholder="Email address"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={ls.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.3)" style={ls.inputIcon} />
            <TextInput
              style={[ls.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            style={[ls.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient colors={['#7c3aed', '#d946ef']} style={ls.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={ls.submitText}>Sign In</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Register link */}
          <View style={ls.footer}>
            <Text style={ls.footerText}>New to AlphaView TV? </Text>
            <TouchableOpacity onPress={() => nav.navigate('Register')}>
              <Text style={ls.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ls = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BRAND.bg },
  glowTop:     { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(217,70,239,0.08)' },
  glowBottom:  { position: 'absolute', bottom: -50, left: -50,  width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(124,58,237,0.08)' },
  content:     { flex: 1, paddingHorizontal: 24 },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 },
  logoIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoLetter:  { color: '#fff', fontSize: 22, fontWeight: '900' },
  logoName:    { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoSub:     { color: BRAND.pink, fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  heading:     { color: '#fff', fontSize: 30, fontWeight: '800', marginBottom: 6 },
  subheading:  { color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139,60,247,0.2)', paddingHorizontal: 14, marginBottom: 14 },
  inputIcon:   { marginRight: 10 },
  input:       { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 14 },
  submitBtn:   { borderRadius: 12, overflow: 'hidden', marginTop: 8, marginBottom: 20 },
  submitGrad:  { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText:  { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  footerLink:  { color: BRAND.purple, fontSize: 13, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════
//  RegisterScreen.tsx
// ═══════════════════════════════════════════════════════
import React as R2, { useState as uS2 } from 'react';
import {
  View as V2, Text as T2, TextInput as TI2, TouchableOpacity as TO2,
  StyleSheet as SS2, KeyboardAvoidingView as KAV2, Platform as P2,
  ScrollView as SV2, ActivityIndicator as AI2, Alert as AL2,
} from 'react-native';
import { LinearGradient as LG2 }    from 'expo-linear-gradient';
import { useSafeAreaInsets as uSAI2 } from 'react-native-safe-area-context';
import { useNavigation as uN2 }      from '@react-navigation/native';
import { Ionicons as IC2 }           from '@expo/vector-icons';
import { authApi }                   from '../services/api';

export function RegisterScreen() {
  const [step,     setStep]     = uS2<'details' | 'otp'>('details');
  const [fullName, setFullName] = uS2('');
  const [email,    setEmail]    = uS2('');
  const [phone,    setPhone]    = uS2('+234');
  const [password, setPassword] = uS2('');
  const [type,     setType]     = uS2<'user' | 'producer'>('user');
  const [otp,      setOtp]      = uS2('');
  const [pinId,    setPinId]    = uS2('');
  const [loading,  setLoading]  = uS2(false);
  const nav    = uN2<any>();
  const insets = uSAI2();

  const handleRegister = async () => {
    if (!fullName || !email || !phone || !password) {
      AL2.alert('Error', 'Please fill in all fields'); return;
    }
    setLoading(true);
    try {
      const { pinId: id } = await authApi.register({ fullName, email, phone, password, accountType: type });
      setPinId(id);
      setStep('otp');
    } catch (err: any) {
      AL2.alert('Registration Failed', err?.message || 'Please try again');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { AL2.alert('Error', 'Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      await authApi.verifyOtp(pinId, otp);
      AL2.alert('Success! 🎬', 'Account created. Please sign in.', [
        { text: 'Sign In', onPress: () => nav.navigate('Login') },
      ]);
    } catch (err: any) {
      AL2.alert('Invalid OTP', err?.message || 'Please try again');
    } finally { setLoading(false); }
  };

  return (
    <KAV2 style={{ flex: 1 }} behavior={P2.OS === 'ios' ? 'padding' : undefined}>
      <SV2 style={rs.container} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <V2 style={{ position: 'absolute', top: -80, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(217,70,239,0.07)' }} />
        <V2 style={[rs.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
          <TO2 onPress={() => nav.goBack()} style={{ marginBottom: 24 }}>
            <IC2 name="chevron-back" size={26} color="#fff" />
          </TO2>

          {step === 'details' ? (
            <>
              <T2 style={rs.heading}>Create Account</T2>
              <T2 style={rs.sub}>Join 50,000+ viewers</T2>

              {/* Account type */}
              <V2 style={rs.typeRow}>
                {(['user', 'producer'] as const).map(t => (
                  <TO2 key={t} style={[rs.typeBtn, type === t && rs.typeBtnActive]} onPress={() => setType(t)}>
                    <T2 style={[rs.typeBtnText, type === t && { color: '#fff' }]}>
                      {t === 'user' ? '👤 Viewer' : '🎬 Producer'}
                    </T2>
                  </TO2>
                ))}
              </V2>

              {[
                { label: 'Full Name',    value: fullName,  setter: setFullName, placeholder: 'Adaeze Okonkwo',     type: 'default'        },
                { label: 'Email',        value: email,     setter: setEmail,    placeholder: 'you@example.com',    type: 'email-address'  },
                { label: 'Phone (+234)', value: phone,     setter: setPhone,    placeholder: '+2348012345678',     type: 'phone-pad'      },
                { label: 'Password',     value: password,  setter: setPassword, placeholder: 'Min 8 characters',   type: 'default', secure: true },
              ].map(({ label, value, setter, placeholder, type: kbType, secure }) => (
                <V2 key={label}>
                  <T2 style={rs.label}>{label}</T2>
                  <TI2
                    style={rs.input}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={value}
                    onChangeText={setter}
                    keyboardType={kbType as any}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                  />
                </V2>
              ))}

              <TO2 style={[rs.btn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
                <LG2 colors={['#7c3aed', '#d946ef']} style={rs.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <AI2 color="#fff" /> : <T2 style={rs.btnText}>Create Account</T2>}
                </LG2>
              </TO2>

              <V2 style={rs.footer}>
                <T2 style={rs.footerText}>Already have an account? </T2>
                <TO2 onPress={() => nav.navigate('Login')}>
                  <T2 style={rs.footerLink}>Sign In</T2>
                </TO2>
              </V2>
            </>
          ) : (
            <>
              <T2 style={rs.heading}>Verify Phone</T2>
              <T2 style={rs.sub}>Enter the 6-digit code sent to{'\n'}{phone}</T2>
              <TI2
                style={[rs.input, { textAlign: 'center', fontSize: 28, letterSpacing: 12, marginTop: 24 }]}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={otp}
                onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TO2 style={[rs.btn, { marginTop: 24 }, loading && { opacity: 0.6 }]} onPress={handleVerify} disabled={loading}>
                <LG2 colors={['#7c3aed', '#d946ef']} style={rs.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <AI2 color="#fff" /> : <T2 style={rs.btnText}>Verify & Continue</T2>}
                </LG2>
              </TO2>
              <TO2 onPress={() => setStep('details')} style={{ alignItems: 'center', marginTop: 12 }}>
                <T2 style={rs.footerLink}>← Back</T2>
              </TO2>
            </>
          )}
        </V2>
      </SV2>
    </KAV2>
  );
}

const rs = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.bg },
  content:   { flex: 1, paddingHorizontal: 24 },
  heading:   { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  sub:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  typeRow:   { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,60,247,0.25)', marginBottom: 16 },
  typeBtn:   { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: BRAND.surface },
  typeBtnActive: { backgroundColor: BRAND.purple },
  typeBtnText:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  label:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginBottom: 6, marginTop: 10, letterSpacing: 0.5 },
  input:     { backgroundColor: BRAND.surface, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139,60,247,0.2)', paddingHorizontal: 14, paddingVertical: 13, color: '#fff', fontSize: 14 },
  btn:       { borderRadius: 12, overflow: 'hidden', marginTop: 20, marginBottom: 16 },
  btnGrad:   { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center' },
  footerText:{ color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  footerLink:{ color: BRAND.purple, fontSize: 13, fontWeight: '600' },
});

export default RegisterScreen;
