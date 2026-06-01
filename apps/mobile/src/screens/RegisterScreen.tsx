import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation }     from '@react-navigation/native';
import { Ionicons }          from '@expo/vector-icons';
import { authApi }           from '../services/api';
import { useAuthStore }      from '../store/auth.store';

const BRAND = { purple: '#7c3aed', pink: '#d946ef', bg: '#080510', card: '#130923', surface: '#1c1035', border: 'rgba(139,60,247,0.25)' };

type Step = 'details' | 'otp' | 'done';

export default function RegisterScreen() {
  const nav    = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuthStore();

  const [step,        setStep]        = useState<Step>('details');
  const [loading,     setLoading]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [pinId,       setPinId]       = useState('');
  const [userId,      setUserId]      = useState('');
  const [otp,         setOtp]         = useState('');
  const [accountType, setAccountType] = useState<'user' | 'producer'>('user');

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '+234', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim())               e.fullName = 'Enter your full name';
    if (!form.email.includes('@'))           e.email    = 'Enter a valid email';
    if (!/^\+234[0-9]{10}$/.test(form.phone)) e.phone  = 'Use format +234XXXXXXXXXX';
    if (form.password.length < 8)            e.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { pinId: id, userId: uid } = await authApi.register({ ...form, accountType });
      setPinId(id);
      setUserId(uid);
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (otp.length !== 6) { Alert.alert('Error', 'Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(pinId, otp, userId);
      setUser(result.user);
      setStep('done');
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, field, ...props }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        value={form[field as keyof typeof form]}
        onChangeText={v => setForm(p => ({ ...p, [field]: v }))}
        placeholderTextColor="rgba(255,255,255,0.2)"
        style={[s.input, errors[field] && s.inputError]}
        {...props}
      />
      {errors[field] && <Text style={s.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 60, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => step === 'details' ? nav.goBack() : setStep('details')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* ── Step: Details ── */}
        {step === 'details' && (
          <>
            <View style={s.logoRow}>
              <View style={s.logoIcon}><Text style={s.logoLetter}>A</Text></View>
              <Text style={s.logoText}>AlphaView TV</Text>
            </View>
            <Text style={s.heading}>Create Account</Text>
            <Text style={s.subheading}>Join thousands of viewers across Africa</Text>

            {/* Account type toggle */}
            <View style={s.typeToggle}>
              {(['user', 'producer'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, accountType === t && s.typeBtnActive]}
                  onPress={() => setAccountType(t)}
                >
                  <Text style={[s.typeBtnText, accountType === t && s.typeBtnTextActive]}>
                    {t === 'user' ? '👤 Viewer' : '🎬 Producer'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Full Name" field="fullName" placeholder="Adaeze Okonkwo" autoCapitalize="words" />
            <Field label="Email" field="email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone (+234...)" field="phone" placeholder="+2348012345678" keyboardType="phone-pad" />

            <View style={{ marginBottom: 14 }}>
              <Text style={s.label}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={form.password}
                  onChangeText={v => setForm(p => ({ ...p, password: v }))}
                  placeholder="Min 8 characters"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry={!showPass}
                  style={[s.input, { paddingRight: 48 }, errors.password && s.inputError]}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={s.errorText}>{errors.password}</Text>}
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={s.label}>Confirm Password</Text>
              <TextInput
                value={form.confirmPassword}
                onChangeText={v => setForm(p => ({ ...p, confirmPassword: v }))}
                placeholder="Repeat password"
                placeholderTextColor="rgba(255,255,255,0.2)"
                secureTextEntry
                style={[s.input, errors.confirmPassword && s.inputError]}
              />
              {errors.confirmPassword && <Text style={s.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={onRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Create Account →</Text>}
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => nav.navigate('Login')}>
                <Text style={s.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step: OTP ── */}
        {step === 'otp' && (
          <View style={s.otpContainer}>
            <View style={s.otpIcon}><Ionicons name="shield-checkmark" size={36} color={BRAND.purple} /></View>
            <Text style={s.heading}>Verify Your Number</Text>
            <Text style={s.subheading}>We sent a 6-digit code to{'\n'}<Text style={{ color: '#fff', fontWeight: '700' }}>{form.phone}</Text></Text>
            <TextInput
              value={otp}
              onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="numeric"
              placeholder="000000"
              placeholderTextColor="rgba(255,255,255,0.2)"
              maxLength={6}
              style={[s.input, s.otpInput]}
            />
            <TouchableOpacity style={[s.primaryBtn, (loading || otp.length !== 6) && { opacity: 0.6 }]} onPress={onVerify} disabled={loading || otp.length !== 6}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Verify & Continue</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && (
          <View style={[s.otpContainer, { paddingTop: 40 }]}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>🎬</Text>
            <Text style={s.heading}>You're In!</Text>
            <Text style={s.subheading}>Welcome to AlphaView TV.{'\n'}Your account is ready.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={() => nav.navigate('Main')}>
              <Text style={s.primaryBtnText}>Start Watching →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BRAND.bg },
  backBtn:          { marginBottom: 8 },
  logoRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoIcon:         { width: 36, height: 36, borderRadius: 10, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center' },
  logoLetter:       { color: '#fff', fontSize: 20, fontWeight: '900' },
  logoText:         { color: '#fff', fontSize: 18, fontWeight: '700' },
  heading:          { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  subheading:       { color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  typeToggle:       { flexDirection: 'row', backgroundColor: BRAND.surface, borderRadius: 10, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: BRAND.border },
  typeBtn:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  typeBtnActive:    { backgroundColor: BRAND.purple },
  typeBtnText:      { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  typeBtnTextActive:{ color: '#fff' },
  label:            { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:            { backgroundColor: BRAND.surface, borderWidth: 1, borderColor: BRAND.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 15 },
  inputError:       { borderColor: '#ef4444' },
  errorText:        { color: '#ef4444', fontSize: 11, marginTop: 4 },
  eyeBtn:           { position: 'absolute', right: 14, top: 14 },
  primaryBtn:       { backgroundColor: BRAND.purple, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  primaryBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow:         { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText:        { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  loginLink:        { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  otpContainer:     { alignItems: 'center', paddingTop: 20 },
  otpIcon:          { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  otpInput:         { textAlign: 'center', fontSize: 28, fontFamily: 'monospace', letterSpacing: 14, width: '100%', marginBottom: 24 },
});
