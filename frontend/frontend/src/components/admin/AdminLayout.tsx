import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  LogOut,
  ShoppingBasket 
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  currentPage: 'overview' | 'orders' | 'products' | 'users';
  onNavigate: (page: 'overview' | 'orders' | 'products' | 'users') => void;
  onLogout: () => void;
}

export function AdminLayout({ children, currentPage, onNavigate, onLogout }: AdminLayoutProps) {
  const menuItems = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'orders' as const, label: 'All Orders', icon: ShoppingCart },
    { id: 'products' as const, label: 'Products', icon: Package },
    { id: 'users' as const, label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="lg:w-64 p-6 lg:border-r lg:border-slate-300/50"
      >
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
              <ShoppingBasket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900">Shop Shadow</h1>
              <p className="text-xs text-slate-600">Admin Panel</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  currentPage === item.id
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
