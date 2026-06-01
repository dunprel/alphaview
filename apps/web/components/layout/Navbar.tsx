'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, User, Menu, X, ChevronDown,
  Home, Library, Download, LogOut, Settings, Film,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/store/auth.store';

const NAV_LINKS = [
  { href: '/',          label: 'Home',     icon: Home   },
  { href: '/movies',    label: 'Browse',   icon: Film   },
  { href: '/library',   label: 'Library',  icon: Library },
  { href: '/downloads', label: 'Downloads',icon: Download },
];

export default function Navbar() {
  const [scrolled,      setScrolled]      = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');

  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuthStore();
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  // Scroll detection for navbar blur
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      <header
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-av-bg/90 backdrop-blur-xl border-b border-av-border shadow-[0_1px_20px_rgba(0,0,0,0.5)]'
            : 'bg-gradient-to-b from-av-bg-deep/80 to-transparent',
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center h-16 gap-6">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Logo variant="full" size="md" />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1 flex-1">
              {NAV_LINKS.map(({ href, label }) => {
                const active = pathname === href ||
                  (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'px-4 py-2 rounded-av text-sm font-medium transition-all duration-150',
                      active
                        ? 'text-white bg-av-surface'
                        : 'text-av-text-muted hover:text-av-text hover:bg-white/5',
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-2 ml-auto">

              {/* Search */}
              <AnimatePresence>
                {searchOpen ? (
                  <motion.form
                    key="search-form"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSearch}
                    className="overflow-hidden"
                  >
                    <input
                      ref={searchRef}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search movies, actors..."
                      className="w-full bg-av-surface border border-av-border-md rounded-av px-4 py-2 text-sm text-av-text placeholder-av-text-dim outline-none focus:border-av-purple transition-colors"
                    />
                  </motion.form>
                ) : null}
              </AnimatePresence>

              <button
                onClick={() => setSearchOpen(v => !v)}
                className="p-2 rounded-av text-av-text-muted hover:text-av-text hover:bg-av-surface transition-all"
                aria-label="Search"
              >
                {searchOpen ? <X size={20} /> : <Search size={20} />}
              </button>

              {/* Notifications */}
              {user && (
                <button className="relative p-2 rounded-av text-av-text-muted hover:text-av-text hover:bg-av-surface transition-all">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-av-pink rounded-full ring-2 ring-av-bg" />
                </button>
              )}

              {/* Profile / Auth */}
              {user ? (
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen(v => !v)}
                    className="flex items-center gap-2 p-1.5 rounded-av hover:bg-av-surface transition-all"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-av-surface flex items-center justify-center ring-2 ring-av-purple/40">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-av-purple-lt">
                          {user.fullName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={14}
                      className={clsx('text-av-text-muted transition-transform', profileOpen && 'rotate-180')}
                    />
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 av-card overflow-hidden z-50"
                        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
                      >
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-av-border">
                          <p className="text-sm font-semibold text-av-text truncate">{user.fullName}</p>
                          <p className="text-xs text-av-text-muted truncate">{user.email}</p>
                        </div>
                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            href="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-av-text-muted hover:text-av-text hover:bg-av-surface transition-colors"
                          >
                            <User size={15} />
                            My Profile
                          </Link>
                          {user.role === 'producer' && (
                            <Link
                              href="/producer/dashboard"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-av-text-muted hover:text-av-text hover:bg-av-surface transition-colors"
                            >
                              <Film size={15} />
                              Producer Portal
                            </Link>
                          )}
                          {user.role === 'admin' && (
                            <Link
                              href="/admin"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-av-text-muted hover:text-av-text hover:bg-av-surface transition-colors"
                            >
                              <Settings size={15} />
                              Admin Portal
                            </Link>
                          )}
                          <Link
                            href="/settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-av-text-muted hover:text-av-text hover:bg-av-surface transition-colors"
                          >
                            <Settings size={15} />
                            Settings
                          </Link>
                        </div>
                        <div className="border-t border-av-border py-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-av-danger hover:bg-av-danger/10 transition-colors"
                          >
                            <LogOut size={15} />
                            Sign out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login" className="btn-ghost text-sm">
                    Sign in
                  </Link>
                  <Link href="/register" className="btn-primary text-sm py-2 px-4">
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden p-2 rounded-av text-av-text-muted hover:text-av-text hover:bg-av-surface transition-all"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-av-border bg-av-bg/95 backdrop-blur-xl overflow-hidden"
            >
              <nav className="px-4 py-3 space-y-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-av text-sm font-medium transition-all',
                        active
                          ? 'bg-av-surface text-white'
                          : 'text-av-text-muted hover:text-av-text hover:bg-av-surface/50',
                      )}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
