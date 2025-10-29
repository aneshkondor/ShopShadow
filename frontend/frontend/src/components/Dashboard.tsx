import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { ConnectionStatus } from './ConnectionStatus';
import { EmptyState } from './EmptyState';
import { ShoppingBasket, LogOut, Trash2, History, Tag } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface BasketItem {
  id: string;
  name: string;
  quantity: number;
  price: number; // Price per unit
}

interface DashboardProps {
  onLogout: () => void;
  onCheckout: (items: BasketItem[], total: number) => void;
  onViewOrders: () => void;
  onViewProducts: () => void;
  isDemo?: boolean;
}

// Mock items with prices - this will come from backend later
const mockItems: BasketItem[] = [
  { id: '1', name: 'Organic Apples', quantity: 3, price: 1.99 },
  { id: '2', name: 'Fresh Milk (1L)', quantity: 1, price: 3.49 },
  { id: '3', name: 'Whole Wheat Bread', quantity: 2, price: 2.99 },
  { id: '4', name: 'Free Range Eggs', quantity: 1, price: 4.99 },
];

export function Dashboard({ onLogout, onCheckout, onViewOrders, onViewProducts, isDemo = false }: DashboardProps) {
  const [items, setItems] = useState<BasketItem[]>(mockItems);
  const [isConnected] = useState(true);

  // TODO: SECURITY - Remove this manual delete function in production
  // Items should ONLY be removed when Raspberry Pi detects physical removal from basket
  // Manual deletion allows users to checkout without paying for items still in physical basket
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Item removed from basket', {
      duration: 2000,
      position: 'bottom-right',
      style: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(148, 163, 184, 0.3)',
        color: '#1e293b',
      },
    });
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = calculateTotal();

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 sm:p-6 pb-4"
      >
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4 sm:mb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
                <ShoppingBasket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">Shop Shadow</h1>
                {isDemo && <p className="text-xs text-slate-600">Demo Mode</p>}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <ConnectionStatus isConnected={isConnected} />
              <button
                onClick={onViewProducts}
                className="text-slate-600 hover:text-slate-800 transition-colors p-2"
                title="Product Catalog"
              >
                <Tag className="w-5 h-5" />
              </button>
              {!isDemo && (
                <button
                  onClick={onViewOrders}
                  className="text-slate-600 hover:text-slate-800 transition-colors p-2"
                  title="Order History"
                >
                  <History className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onLogout}
                className="text-slate-600 hover:text-slate-800 transition-colors p-2"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
            <div className="sm:hidden">
              <ConnectionStatus isConnected={isConnected} />
            </div>
          </div>
          
          {/* Mobile Navigation Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:hidden mt-4 pt-4 border-t border-slate-200/50">
            <GlassButton
              variant="secondary"
              onClick={onViewProducts}
              className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
            >
              <Tag className="w-5 h-5 mb-1" />
              <span className="text-xs">Products</span>
            </GlassButton>
            {!isDemo && (
              <GlassButton
                variant="secondary"
                onClick={onViewOrders}
                className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
              >
                <History className="w-5 h-5 mb-1" />
                <span className="text-xs">Orders</span>
              </GlassButton>
            )}
            <GlassButton
              variant="secondary"
              onClick={onLogout}
              className="flex flex-col items-center justify-center py-3 px-2 text-slate-700"
            >
              <LogOut className="w-5 h-5 mb-1" />
              <span className="text-xs">Logout</span>
            </GlassButton>
          </div>
        </GlassCard>
      </motion.header>

      {/* Main Content */}
      <main className="px-6">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900">Your Basket</h2>
              <span className="text-slate-600">{totalItems} items</span>
            </div>

            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard hover className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 truncate">{item.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-slate-600 text-sm">Qty: {item.quantity}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 text-sm">${item.price.toFixed(2)} each</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-900">${(item.price * item.quantity).toFixed(2)}</span>
                        {/* TODO: Remove in production - items should only update via Raspberry Pi detection */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-2"
                          title="Demo only - not available in production"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Bottom Bar with Total and Checkout */}
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 to-transparent"
        >
          <GlassCard className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Total Amount</p>
                  <p className="text-slate-900 text-3xl">${totalCost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-600 text-sm">Items</p>
                  <p className="text-slate-900 text-2xl">{totalItems}</p>
                </div>
              </div>
              <GlassButton
                variant="primary"
                onClick={() => onCheckout(items, totalCost)}
                className="w-full text-white py-4"
              >
                Proceed to Checkout
              </GlassButton>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
