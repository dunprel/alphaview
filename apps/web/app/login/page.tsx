'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/store/auth.store';
import type { LoginForm } from '@/types';

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuthStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      // Redirect based on role
      if (user.role === 'admin')    router.push('/admin');
      else if (user.role === 'producer') router.push('/producer/dashboard');
      else router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12"
        style={{
          background: 'linear-gradient(145deg, #1c1035 0%, #080510 60%, #13092a 100%)',
        }}
      >
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #d946ef, transparent)' }} />
        {/* Film grain overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10">
          <Logo variant="full" size="lg" />
        </div>

        <div className="relative z-10">
          <blockquote className="text-3xl font-display text-white leading-snug mb-4"
            style={{ letterSpacing: '0.03em' }}>
            "Nigeria's Stories,<br/>
            The World's Stage."
          </blockquote>
          <p className="text-av-text-muted text-sm">
            Buy. Stream. Experience. 30-day access per purchase.
          </p>
        </div>

        <div className="relative z-10 flex gap-8">
          {[
            { value: '50K+', label: 'Viewers' },
            { value: '2K+',  label: 'Titles'  },
            { value: '500+', label: 'Producers'},
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-xl font-bold av-text-gradient">{value}</div>
              <div className="text-xs text-av-text-dim mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-av-bg">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo variant="full" size="md" />
          </div>

          <h2 className="font-display text-3xl text-white mb-1" style={{ letterSpacing: '0.04em' }}>
            Welcome Back
          </h2>
          <p className="text-av-text-muted text-sm mb-8">
            Sign in to continue watching
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium text-av-text-muted mb-1.5 block">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="av-input pl-10"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-av-danger mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-av-text-muted">Password</label>
                <Link href="/forgot-password" className="text-xs text-av-purple-lt hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-av-text-dim" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="av-input pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-av-text-dim hover:text-av-text-muted transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-av-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-av-border" />
            <span className="text-xs text-av-text-dim">or continue with</span>
            <div className="flex-1 h-px bg-av-border" />
          </div>

          {/* Google OAuth */}
          <button className="btn-secondary w-full text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-av-text-muted mt-6">
            New to AlphaView TV?{' '}
            <Link href="/register" className="text-av-purple-lt hover:underline font-medium">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
