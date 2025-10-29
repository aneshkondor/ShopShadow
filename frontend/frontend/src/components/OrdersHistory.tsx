import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { ShoppingBasket, ArrowLeft, Image as ImageIcon, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  total: number;
  items: OrderItem[];
  basketPhotoUrl: string;
  status: 'completed' | 'pending';
}

interface OrdersHistoryProps {
  onBack: () => void;
  onLogout: () => void;
}

// Mock orders data - this will come from backend later
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    date: '2025-10-28',
    total: 23.45,
    status: 'completed',
    basketPhotoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    items: [
      { id: '1', name: 'Organic Apples', quantity: 3, price: 1.99 },
      { id: '2', name: 'Fresh Milk (1L)', quantity: 2, price: 3.49 },
      { id: '3', name: 'Whole Wheat Bread', quantity: 1, price: 2.99 },
      { id: '4', name: 'Free Range Eggs', quantity: 1, price: 4.99 },
    ],
  },
  {
    id: 'ORD-002',
    date: '2025-10-27',
    total: 15.92,
    status: 'completed',
    basketPhotoUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
    items: [
      { id: '5', name: 'Greek Yogurt', quantity: 2, price: 4.49 },
      { id: '6', name: 'Bananas', quantity: 1, price: 2.49 },
      { id: '7', name: 'Orange Juice (1L)', quantity: 1, price: 4.45 },
    ],
  },
  {
    id: 'ORD-003',
    date: '2025-10-25',
    total: 31.20,
    status: 'completed',
    basketPhotoUrl: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&q=80',
    items: [
      { id: '8', name: 'Chicken Breast', quantity: 2, price: 8.99 },
      { id: '9', name: 'Cherry Tomatoes', quantity: 1, price: 3.99 },
      { id: '10', name: 'Pasta', quantity: 2, price: 2.49 },
      { id: '11', name: 'Olive Oil', quantity: 1, price: 7.99 },
    ],
  },
];

export function OrdersHistory({ onBack, onLogout }: OrdersHistoryProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 pb-4"
      >
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
                <ShoppingBasket className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-slate-900">Order History</h1>
            </div>
          </div>
        </GlassCard>
      </motion.header>

      {/* Orders List */}
      <main className="px-6 space-y-4">
        <p className="text-slate-600">{mockOrders.length} previous orders</p>
        
        <AnimatePresence mode="popLayout">
          {mockOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard hover className="p-5">
                <div className="space-y-4">
                  {/* Order Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-slate-900">{order.id}</h3>
                      <p className="text-slate-600 text-sm mt-1">
                        {formatDate(order.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-900 text-xl">${order.total.toFixed(2)}</p>
                      <span className="inline-block mt-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="space-y-2 pt-2 border-t border-slate-300/50">
                    {order.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-slate-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-slate-500 text-xs">
                        +{order.items.length - 3} more items
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <GlassButton
                      variant="secondary"
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 text-slate-700"
                    >
                      View Details
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowPhoto(true);
                      }}
                      className="flex-1 text-white flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      View Photo
                    </GlassButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && !showPhoto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedOrder(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <GlassCard className="w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-slate-900">{selectedOrder.id}</h2>
                      <p className="text-slate-600 text-sm">
                        {formatDate(selectedOrder.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-300/50">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-slate-600">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-slate-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-300/50 flex justify-between">
                    <span className="text-slate-900">Total</span>
                    <span className="text-slate-900 text-xl">
                      ${selectedOrder.total.toFixed(2)}
                    </span>
                  </div>

                  <GlassButton
                    variant="primary"
                    onClick={() => setShowPhoto(true)}
                    className="w-full text-white flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    View Basket Photo
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedOrder && showPhoto && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
              onClick={() => setShowPhoto(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="relative w-full max-w-3xl">
                <button
                  onClick={() => setShowPhoto(false)}
                  className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors flex items-center gap-2"
                >
                  <X className="w-6 h-6" />
                  Close
                </button>
                
                <GlassCard className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-slate-900">Basket Verification Photo</h3>
                      <span className="text-slate-600 text-sm">{selectedOrder.id}</span>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden bg-slate-100">
                      <ImageWithFallback
                        src={selectedOrder.basketPhotoUrl}
                        alt={`Basket photo for order ${selectedOrder.id}`}
                        className="w-full h-auto"
                      />
                    </div>
                    
                    <p className="text-slate-600 text-sm text-center">
                      Photo taken: {formatDate(selectedOrder.date)}
                    </p>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
