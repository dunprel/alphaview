'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Film, Upload, BarChart2, Wallet,
  Users, User, Settings, LogOut, ChevronLeft,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/store/auth.store';

const NAV = [
  { href: '/producer/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/producer/content',   label: 'My Content', icon: Film             },
  { href: '/producer/upload',    label: 'Upload',     icon: Upload           },
  { href: '/producer/analytics', label: 'Analytics',  icon: BarChart2        },
  { href: '/producer/earnings',  label: 'Earnings',   icon: Wallet           },
  { href: '/producer/payouts',   label: 'Payouts',    icon: Wallet           },
  { href: '/producer/profile',   label: 'Profile',    icon: User             },
];

interface Props { active?: string }

export default function ProducerSidebar({ active }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{ background: '#0d0819', borderRight: '1px solid rgba(139,60,247,0.12)' }}>

      {/* Logo area */}
      <div className="px-5 pt-6 pb-4 border-b border-av-border">
        <Logo variant="full" size="sm" />
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-av-elevated flex items-center justify-center text-[10px] font-bold text-av-purple-lt flex-shrink-0">
            {user?.fullName?.[0] ?? 'P'}
          </div>
          <span className="text-xs text-av-text-muted truncate">{user?.fullName ?? 'Producer'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-[10px] font-semibold text-av-text-dim uppercase tracking-widest mb-3">
          Producer Studio
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={clsx(
                'sidebar-item text-sm',
                isActive && 'active',
              )}>
              <Icon size={16} />
              {label}
              {isActive && (
                <motion.div layoutId="sidebar-active-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-av-pink" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 border-t border-av-border pt-4 space-y-0.5">
        <Link href="/" className="sidebar-item text-sm">
          <ChevronLeft size={16} /> Back to App
        </Link>
        <Link href="/producer/settings" className="sidebar-item text-sm">
          <Settings size={16} /> Settings
        </Link>
        <button onClick={logout} className="sidebar-item text-sm text-av-danger hover:text-av-danger hover:bg-av-danger/10 w-full">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
