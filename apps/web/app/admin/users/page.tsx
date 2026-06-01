'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Ban, CheckCircle, Eye, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from '@/components/admin/AdminSidebar';
import api from '@/lib/api/client';
import { timeAgo } from '@/lib/utils';

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('');
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/admin/users', {
      params: { search, role: role || undefined, page, limit: 20 },
    });
    setUsers(data.data);
    setTotal(data.meta.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, role, page]);

  const ban = async (id: string, isBanned: boolean) => {
    try {
      await api.patch(`/admin/users/${id}/${isBanned ? 'unban' : 'ban'}`);
      toast.success(`User ${isBanned ? 'unbanned' : 'banned'}`);
      load();
    } catch { toast.error('Action failed'); }
  };

  return (
    <div className="flex min-h-screen bg-av-bg">
      <AdminSidebar active="users" />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-white" style={{ letterSpacing: '0.04em' }}>User Management</h1>
            <p className="text-av-text-muted text-sm mt-1">{total.toLocaleString()} registered users</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-av-text-dim" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="av-input pl-9 py-2.5 text-sm w-full" />
          </div>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="av-input text-sm w-40">
            <option value="">All Roles</option>
            <option value="user">Viewers</option>
            <option value="producer">Producers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        <div className="av-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-av-border">
                {['User', 'Phone', 'Role', 'Joined', 'Purchases', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-av-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-av-border">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-4 w-24 rounded" /></td>
                    ))}</tr>
                  ))
                : users.map((u: any, i) => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-av-surface/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-av-elevated flex items-center justify-center text-xs font-bold text-av-purple-lt flex-shrink-0">
                          {u.fullName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-av-text">{u.fullName}</div>
                          <div className="text-xs text-av-text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-av-text-muted">{u.phone ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`av-badge text-[10px] capitalize ${
                        u.role === 'admin'    ? 'av-badge-pink'   :
                        u.role === 'producer' ? 'av-badge-purple' : 'av-badge text-av-text-muted bg-av-surface border border-av-border'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-av-text-muted">{timeAgo(u.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm text-av-text">{u.purchaseCount ?? 0}</td>
                    <td className="px-5 py-3.5">
                      {u.isBanned
                        ? <span className="av-badge-red text-[10px]">Banned</span>
                        : u.isVerified
                        ? <span className="av-badge-green text-[10px]">Active</span>
                        : <span className="av-badge-yellow text-[10px]">Unverified</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        <button className="p-1.5 rounded-av text-av-text-muted hover:text-av-purple-lt hover:bg-av-surface transition-all" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => ban(u.id, u.isBanned)}
                          className={`p-1.5 rounded-av transition-all ${u.isBanned ? 'text-av-success hover:bg-av-success/10' : 'text-av-text-muted hover:text-av-danger hover:bg-av-danger/10'}`}
                          title={u.isBanned ? 'Unban' : 'Ban'}>
                          {u.isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-av-border">
              <span className="text-xs text-av-text-muted">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-av text-xs border border-av-border text-av-text-muted disabled:opacity-40 hover:border-av-border-md transition-all">
                  ← Prev
                </button>
                <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-av text-xs border border-av-border text-av-text-muted disabled:opacity-40 hover:border-av-border-md transition-all">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
