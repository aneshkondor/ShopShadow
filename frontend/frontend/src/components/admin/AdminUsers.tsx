import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Mail, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAdminUsers, type AdminUser } from '../../utils/api';
import { toast } from 'sonner';

interface AdminUsersProps {
  authToken: string;
}

export function AdminUsers({ authToken }: AdminUsersProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await getAdminUsers(authToken, page, 20, searchQuery);
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users', {
          duration: 3000,
          position: 'bottom-right',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [authToken, page, searchQuery]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && page === 1) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-200/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-slate-900 mb-2">Users</h2>
        <p className="text-slate-600">Manage registered users</p>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1); // Reset to page 1 on search
          }}
          className="pl-10 bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <p className="text-slate-600 text-sm">Total Users</p>
          <p className="text-slate-900 text-3xl mt-2">{stats.totalUsers}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-slate-600 text-sm">Active Users</p>
          <p className="text-slate-900 text-3xl mt-2">{stats.activeUsers}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-slate-600 text-sm">Total Revenue</p>
          <p className="text-slate-900 text-3xl mt-2">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </GlassCard>
      </div>

      {/* Users Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/5 border-b border-slate-300/50">
              <tr>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">User ID</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Name</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Email</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Join Date</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Orders</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Total Spent</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    {searchQuery ? 'No users found' : 'No users yet'}
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-300/50 last:border-0 hover:bg-slate-800/5"
                  >
                    <td className="px-6 py-4 text-slate-900">{user.id}</td>
                    <td className="px-6 py-4 text-slate-900">{user.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-900">{user.totalOrders}</td>
                    <td className="px-6 py-4 text-slate-900">${user.totalSpent.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <Badge
                        className={user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                      >
                        {user.status}
                      </Badge>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-slate-600 text-sm">
          Showing {users.length} of {total} users
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white/50 border border-slate-300/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-slate-600 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white/50 border border-slate-300/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
