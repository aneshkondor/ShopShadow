import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { GlassButton } from '../GlassButton';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Eye, X, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  total: number;
  items: OrderItem[];
  basketPhotoUrl: string;
  status: 'completed' | 'pending' | 'processing';
}

// Mock orders data - this will come from PostgreSQL database later
const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    userId: 'USR-001',
    userName: 'John Doe',
    userEmail: 'john@email.com',
    date: '2025-10-29',
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
    userId: 'USR-002',
    userName: 'Jane Smith',
    userEmail: 'jane@email.com',
    date: '2025-10-29',
    total: 15.92,
    status: 'processing',
    basketPhotoUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
    items: [
      { id: '5', name: 'Greek Yogurt', quantity: 2, price: 4.49 },
      { id: '6', name: 'Bananas', quantity: 1, price: 2.49 },
      { id: '7', name: 'Orange Juice (1L)', quantity: 1, price: 4.45 },
    ],
  },
  {
    id: 'ORD-003',
    userId: 'USR-001',
    userName: 'John Doe',
    userEmail: 'john@email.com',
    date: '2025-10-28',
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
  {
    id: 'ORD-004',
    userId: 'USR-003',
    userName: 'Mike Wilson',
    userEmail: 'mike@email.com',
    date: '2025-10-28',
    total: 67.85,
    status: 'pending',
    basketPhotoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    items: [
      { id: '12', name: 'Salmon Fillet', quantity: 2, price: 12.99 },
      { id: '13', name: 'Spinach', quantity: 3, price: 2.99 },
      { id: '14', name: 'Coffee Beans', quantity: 1, price: 9.99 },
      { id: '15', name: 'Chicken Breast', quantity: 3, price: 8.99 },
    ],
  },
];

export function AdminOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  const filteredOrders = mockOrders.filter(order =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-slate-900 mb-2">All Orders</h2>
        <p className="text-slate-600">Manage and track all customer orders</p>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by order ID, customer name, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Orders Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/5 border-b border-slate-300/50">
              <tr>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Order ID</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Customer</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Date</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Items</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Total</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Status</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-slate-300/50 last:border-0 hover:bg-slate-800/5"
                >
                  <td className="px-6 py-4 text-slate-900">{order.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-slate-900">{order.userName}</p>
                      <p className="text-slate-600 text-xs">{order.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">{formatDate(order.date)}</td>
                  <td className="px-6 py-4 text-slate-600">{order.items.length} items</td>
                  <td className="px-6 py-4 text-slate-900">${order.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-slate-700 hover:text-slate-900 transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <p className="text-slate-600 text-sm">
        Showing {filteredOrders.length} of {mockOrders.length} orders
      </p>

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
              <GlassCard className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-slate-900">{selectedOrder.id}</h2>
                      <p className="text-slate-600 text-sm mt-1">
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

                  {/* Customer Info */}
                  <div className="pt-4 border-t border-slate-300/50">
                    <h3 className="text-slate-900 mb-3">Customer Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Name:</span>
                        <span className="text-slate-900">{selectedOrder.userName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Email:</span>
                        <span className="text-slate-900">{selectedOrder.userEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">User ID:</span>
                        <span className="text-slate-900">{selectedOrder.userId}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="pt-4 border-t border-slate-300/50">
                    <h3 className="text-slate-900 mb-3">Order Items</h3>
                    <div className="space-y-3">
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
              <div className="relative w-full max-w-4xl">
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
