import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Mail, Calendar } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive';
}

// Mock users - this will come from PostgreSQL database later
const mockUsers: User[] = [
  {
    id: 'USR-001',
    name: 'John Doe',
    email: 'john@email.com',
    joinDate: '2025-09-15',
    totalOrders: 12,
    totalSpent: 456.78,
    status: 'active',
  },
  {
    id: 'USR-002',
    name: 'Jane Smith',
    email: 'jane@email.com',
    joinDate: '2025-10-01',
    totalOrders: 8,
    totalSpent: 234.56,
    status: 'active',
  },
  {
    id: 'USR-003',
    name: 'Mike Wilson',
    email: 'mike@email.com',
    joinDate: '2025-08-22',
    totalOrders: 25,
    totalSpent: 892.34,
    status: 'active',
  },
  {
    id: 'USR-004',
    name: 'Sarah Johnson',
    email: 'sarah@email.com',
    joinDate: '2025-07-10',
    totalOrders: 5,
    totalSpent: 123.45,
    status: 'inactive',
  },
];

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

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
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <p className="text-slate-600 text-sm">Total Users</p>
          <p className="text-slate-900 text-3xl mt-2">{mockUsers.length}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-slate-600 text-sm">Active Users</p>
          <p className="text-slate-900 text-3xl mt-2">
            {mockUsers.filter(u => u.status === 'active').length}
          </p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-slate-600 text-sm">Total Revenue</p>
          <p className="text-slate-900 text-3xl mt-2">
            ${mockUsers.reduce((sum, u) => sum + u.totalSpent, 0).toFixed(2)}
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
              {filteredUsers.map((user, index) => (
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
                      {formatDate(user.joinDate)}
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
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <p className="text-slate-600 text-sm">
        Showing {filteredUsers.length} of {mockUsers.length} users
      </p>
    </div>
  );
}
