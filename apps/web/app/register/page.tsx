'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '@/components/ui/Logo';
import { authApi } from '@/lib/api/auth';

const schema = z.object({
  fullName:        z.string().min(2, 'Enter your full name'),
  email:           z.string().email('Enter a valid email'),
  phone:           z.string().regex(/^\+234[0-9]{10}$/, 'Enter a valid Nigerian number (+234...)'),
  password:        z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
  accountType:     z.enum(['user', 'producer']),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;
type Step = 'details' | 'otp' | 'success';

export default function RegisterPage() {
  const [step,        setStep]        = useState<Step>('details');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [otpValue,    setOtpValue]    = useState('');
  const [pinId,       setPinId]       = useState('');
  const [userPhone,   setUserPhone]   = useState('');
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'user' },
  });

  const accountType = watch('accountType');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { pinId: id } = await authApi.register(data);
      setPinId(id);
      setUserPhone(data.phone);
      setStep('otp');
      toast.success('OTP sent to your phone!');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const onVerifyOtp = async () => {
    if (otpValue.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      await authApi.verifyOtp(pinId, otpValue);
      setStep('success');
    } catch { toast.error('Invalid or expired OTP.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-av-bg px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #d946ef, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/"><Logo variant="full" size="lg" /></Link>
        </div>
        <div className="av-card p-8">
          <AnimatePresence mode="wait">
            {step === 'details' && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="font-display text-3xl text-white mb-1" style={{ letterSpacing: '0.04em' }}>Create Account</h2>
                <p className="text-av-text-muted text-sm mb-6">Join 50,000+ viewers on AlphaView TV</p>
                <div className="flex rounded-av overflow-hidden border border-av-border mb-6">
                  {(['user', 'producer'] as const).map(type => (
                    <label key={type} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium cursor-pointer transition-all ${accountType === type ? 'text-white' : 'bg-av-surface text-av-text-muted'}`}
                      style={accountType === type ? { background: 'linear-gradient(135deg,#7c3aed,#d946ef)' } : {}}>
                      <input {...register('accountType')} type="radio" value={type} className="hidden" />
                      {type === 'user' ? '👤 Viewer' : '🎬 Producer'}
                    </label>
                  ))}
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Full Name</label>
                    <div className="relative"><User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                      <input {...register('fullName')} type="text" placeholder="Adaeze Okonkwo" className="av-input pl-10" /></div>
                    {errors.fullName && <p className="text-xs text-av-danger mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Email</label>
                    <div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                      <input {...register('email')} type="email" placeholder="you@example.com" className="av-input pl-10" /></div>
                    {errors.email && <p className="text-xs text-av-danger mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Phone (+234...)</label>
                    <div className="relative"><Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                      <input {...register('phone')} type="tel" placeholder="+2348012345678" className="av-input pl-10" /></div>
                    {errors.phone && <p className="text-xs text-av-danger mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Password</label>
                    <div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                      <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Min 8 characters" className="av-input pl-10 pr-10" />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-av-text-dim">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
                    {errors.password && <p className="text-xs text-av-danger mt-1">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-av-text-muted mb-1.5 block">Confirm Password</label>
                    <div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                      <input {...register('confirmPassword')} type="password" placeholder="••••••••" className="av-input pl-10" /></div>
                    {errors.confirmPassword && <p className="text-xs text-av-danger mt-1">{errors.confirmPassword.message}</p>}
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                    {loading ? 'Creating account...' : <><span>Create Account</span><ArrowRight size={16} /></>}
                  </button>
                </form>
                <p className="text-center text-sm text-av-text-muted mt-5">
                  Already have an account?{' '}<Link href="/login" className="text-av-purple-lt hover:underline font-medium">Sign in</Link>
                </p>
              </motion.div>
            )}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  <ShieldCheck size={28} className="text-av-purple-lt" /></div>
                <h2 className="font-display text-2xl text-white mb-2">Verify Your Number</h2>
                <p className="text-av-text-muted text-sm mb-8">We sent a 6-digit code to<br /><span className="text-av-text font-medium">{userPhone}</span></p>
                <input value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/\D/g,'').slice(0,6))}
                  type="text" inputMode="numeric" placeholder="000000" maxLength={6}
                  className="av-input text-center text-2xl font-mono tracking-[0.5em] mb-6" />
                <button onClick={onVerifyOtp} disabled={loading || otpValue.length !== 6} className="btn-primary w-full disabled:opacity-60">
                  {loading ? 'Verifying...' : 'Verify & Continue'}</button>
                <button onClick={() => setStep('details')} className="btn-ghost w-full mt-3 text-sm">← Back</button>
              </motion.div>
            )}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="text-6xl mb-6">🎬</motion.div>
                <h2 className="font-display text-3xl text-white mb-3">You're In!</h2>
                <p className="text-av-text-muted text-sm mb-8">Welcome to AlphaView TV. Your account is ready.</p>
                <button onClick={() => router.push('/')} className="btn-primary w-full">Start Watching <ArrowRight size={16} /></button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
