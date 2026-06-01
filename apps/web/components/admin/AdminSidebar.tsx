'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Film, Users, UserCheck, CreditCard,
  Wallet, Settings, LogOut, Shield, AlertOctagon, BarChart2,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '@/components/ui/Logo';
import { useAuthStore } from '@/store/auth.store';

const NAV = [
  { href: '/admin',              label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { href: '/admin/content',      label: 'Content',    icon: Film             },
  { href: '/admin/users',        label: 'Users',      icon: Users            },
  { href: '/admin/producers',    label: 'Producers',  icon: UserCheck        },
  { href: '/admin/payments',     label: 'Payments',   icon: CreditCard       },
  { href: '/admin/payouts',      label: 'Payouts',    icon: Wallet           },
  { href: '/admin/analytics',    label: 'Analytics',  icon: BarChart2        },
  { href: '/admin/moderation',   label: 'Flagged',    icon: AlertOctagon     },
  { href: '/admin/settings',     label: 'Settings',   icon: Settings         },
];

interface Props { active?: string }

export default function AdminSidebar({ active }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{ background: '#060410', borderRight: '1px solid rgba(217,70,239,0.10)' }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-av-border">
        <Logo variant="full" size="sm" />
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#d946ef)' }}>
            {user?.fullName?.[0] ?? 'A'}
          </div>
          <div>
            <div className="text-xs text-av-text truncate">{user?.fullName}</div>
            <div className="text-[10px] text-av-text-dim flex items-center gap-1">
              <Shield size={8} className="text-av-pink-lt" /> Admin
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 text-[10px] font-semibold text-av-text-dim uppercase tracking-widest mb-3">
          Admin Portal
        </p>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={clsx('sidebar-item text-sm', isActive && 'active')}>
              <Icon size={16} />
              {label}
              {isActive && (
                <motion.div layoutId="admin-sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-av-pink" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-6 border-t border-av-border pt-4">
        <button onClick={logout}
          className="sidebar-item text-sm text-av-danger hover:text-av-danger hover:bg-av-danger/10 w-full">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
