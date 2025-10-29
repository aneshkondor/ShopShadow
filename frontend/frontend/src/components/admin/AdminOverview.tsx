import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data - this will come from PostgreSQL database later
const salesData = [
  { date: 'Mon', revenue: 450, orders: 12 },
  { date: 'Tue', revenue: 520, orders: 15 },
  { date: 'Wed', revenue: 380, orders: 10 },
  { date: 'Thu', revenue: 680, orders: 18 },
  { date: 'Fri', revenue: 720, orders: 22 },
  { date: 'Sat', revenue: 890, orders: 28 },
  { date: 'Sun', revenue: 650, orders: 20 },
];

const categoryData = [
  { name: 'Fruits', value: 30 },
  { name: 'Dairy', value: 25 },
  { name: 'Meat', value: 20 },
  { name: 'Beverages', value: 15 },
  { name: 'Other', value: 10 },
];

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function AdminOverview() {
  const stats = [
    { label: 'Total Revenue', value: '$4,290', change: '+12.5%', icon: DollarSign, color: 'emerald' },
    { label: 'Total Orders', value: '125', change: '+8.2%', icon: ShoppingCart, color: 'blue' },
    { label: 'Products Sold', value: '342', change: '+15.3%', icon: Package, color: 'purple' },
    { label: 'Avg Order Value', value: '$34.32', change: '+4.1%', icon: TrendingUp, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-slate-900 mb-2">Dashboard Overview</h2>
        <p className="text-slate-600">Welcome to your admin dashboard</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard hover className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-600 text-sm">{stat.label}</p>
                  <p className="text-slate-900 text-2xl mt-2">{stat.value}</p>
                  <p className="text-emerald-600 text-sm mt-2">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-slate-900 mb-4">Weekly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Orders Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-slate-900 mb-4">Weekly Orders</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-slate-900 mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-slate-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { action: 'New order placed', user: 'John Doe', time: '2 mins ago', amount: '$45.99' },
                { action: 'Product updated', user: 'Admin', time: '15 mins ago', amount: null },
                { action: 'New order placed', user: 'Jane Smith', time: '32 mins ago', amount: '$23.45' },
                { action: 'User registered', user: 'Mike Wilson', time: '1 hour ago', amount: null },
              ].map((activity, index) => (
                <div key={index} className="flex items-start justify-between pb-3 border-b border-slate-300/50 last:border-0">
                  <div>
                    <p className="text-slate-900 text-sm">{activity.action}</p>
                    <p className="text-slate-600 text-xs mt-1">{activity.user} • {activity.time}</p>
                  </div>
                  {activity.amount && (
                    <span className="text-emerald-600">{activity.amount}</span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
