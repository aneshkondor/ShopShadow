import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { Input } from './ui/input';
import { ShoppingBasket, ArrowLeft, Search } from 'lucide-react';
import { Badge } from './ui/badge';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

interface ProductCatalogProps {
  onBack: () => void;
}

// Mock products - this will come from PostgreSQL database later
const mockProducts: Product[] = [
  { id: 'P001', name: 'Organic Apples', category: 'Fruits', price: 1.99, inStock: true },
  { id: 'P002', name: 'Fresh Milk (1L)', category: 'Dairy', price: 3.49, inStock: true },
  { id: 'P003', name: 'Whole Wheat Bread', category: 'Bakery', price: 2.99, inStock: true },
  { id: 'P004', name: 'Free Range Eggs', category: 'Dairy', price: 4.99, inStock: true },
  { id: 'P005', name: 'Greek Yogurt', category: 'Dairy', price: 4.49, inStock: true },
  { id: 'P006', name: 'Bananas', category: 'Fruits', price: 2.49, inStock: true },
  { id: 'P007', name: 'Orange Juice (1L)', category: 'Beverages', price: 4.45, inStock: true },
  { id: 'P008', name: 'Chicken Breast', category: 'Meat', price: 8.99, inStock: true },
  { id: 'P009', name: 'Cherry Tomatoes', category: 'Vegetables', price: 3.99, inStock: true },
  { id: 'P010', name: 'Pasta', category: 'Pantry', price: 2.49, inStock: true },
  { id: 'P011', name: 'Olive Oil', category: 'Pantry', price: 7.99, inStock: true },
  { id: 'P012', name: 'Cheddar Cheese', category: 'Dairy', price: 5.99, inStock: false },
  { id: 'P013', name: 'Salmon Fillet', category: 'Seafood', price: 12.99, inStock: true },
  { id: 'P014', name: 'Spinach', category: 'Vegetables', price: 2.99, inStock: true },
  { id: 'P015', name: 'Coffee Beans', category: 'Beverages', price: 9.99, inStock: true },
];

export function ProductCatalog({ onBack }: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(mockProducts.map(p => p.category)))];

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
              <h1 className="text-slate-900">Product Catalog</h1>
            </div>
          </div>
        </GlassCard>
      </motion.header>

      {/* Search and Filters */}
      <div className="px-6 mb-6 space-y-4">
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

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'bg-white/40 text-slate-700 hover:bg-white/60'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <main className="px-6">
        <p className="text-slate-600 mb-4">
          {filteredProducts.length} products found
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard hover className="p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-slate-900">{product.name}</h3>
                      <p className="text-slate-600 text-sm mt-1">{product.category}</p>
                    </div>
                    <Badge 
                      variant={product.inStock ? 'default' : 'secondary'}
                      className={product.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                    >
                      {product.inStock ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-300/50 flex items-center justify-between">
                    <span className="text-slate-600 text-sm">Price</span>
                    <span className="text-slate-900 text-2xl">${product.price.toFixed(2)}</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
