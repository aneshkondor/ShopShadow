import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { GlassButton } from '../GlassButton';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  inStock: boolean;
}

// Mock products - this will come from PostgreSQL database later
const mockProducts: Product[] = [
  { id: 'P001', name: 'Organic Apples', category: 'Fruits', price: 1.99, stock: 150, inStock: true },
  { id: 'P002', name: 'Fresh Milk (1L)', category: 'Dairy', price: 3.49, stock: 85, inStock: true },
  { id: 'P003', name: 'Whole Wheat Bread', category: 'Bakery', price: 2.99, stock: 45, inStock: true },
  { id: 'P004', name: 'Free Range Eggs', category: 'Dairy', price: 4.99, stock: 120, inStock: true },
  { id: 'P005', name: 'Greek Yogurt', category: 'Dairy', price: 4.49, stock: 67, inStock: true },
  { id: 'P006', name: 'Bananas', category: 'Fruits', price: 2.49, stock: 200, inStock: true },
  { id: 'P007', name: 'Orange Juice (1L)', category: 'Beverages', price: 4.45, stock: 58, inStock: true },
  { id: 'P008', name: 'Chicken Breast', category: 'Meat', price: 8.99, stock: 42, inStock: true },
  { id: 'P009', name: 'Cherry Tomatoes', category: 'Vegetables', price: 3.99, stock: 95, inStock: true },
  { id: 'P010', name: 'Pasta', category: 'Pantry', price: 2.49, stock: 180, inStock: true },
  { id: 'P011', name: 'Olive Oil', category: 'Pantry', price: 7.99, stock: 34, inStock: true },
  { id: 'P012', name: 'Cheddar Cheese', category: 'Dairy', price: 5.99, stock: 0, inStock: false },
];

export function AdminProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products] = useState<Product[]>(mockProducts);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-slate-900 mb-2">Products</h2>
          <p className="text-slate-600">Manage your product catalog</p>
        </div>
        <GlassButton variant="primary" className="text-white flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Product
        </GlassButton>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Products Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/5 border-b border-slate-300/50">
              <tr>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Product ID</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Name</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Category</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Price</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Stock</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Status</th>
                <th className="text-left px-6 py-4 text-slate-700 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-slate-300/50 last:border-0 hover:bg-slate-800/5"
                >
                  <td className="px-6 py-4 text-slate-900">{product.id}</td>
                  <td className="px-6 py-4 text-slate-900">{product.name}</td>
                  <td className="px-6 py-4 text-slate-600">{product.category}</td>
                  <td className="px-6 py-4 text-slate-900">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-600">{product.stock} units</td>
                  <td className="px-6 py-4">
                    <Badge 
                      className={product.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                    >
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-slate-700 hover:text-blue-600 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-slate-700 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <p className="text-slate-600 text-sm">
        Showing {filteredProducts.length} of {products.length} products
      </p>
    </div>
  );
}
