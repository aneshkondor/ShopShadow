import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '../GlassCard';
import { GlassButton } from '../GlassButton';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { fetchProducts, updateProduct, deleteProduct } from '../../utils/api';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
}

interface AdminProductsProps {
  authToken: string;
}

export function AdminProducts({ authToken }: AdminProductsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
  });

  // Fetch products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts(1, 100, searchQuery);
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products', {
        duration: 3000,
        position: 'bottom-right',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [searchQuery]);

  // Open edit modal
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
    });
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    try {
      await updateProduct(editingProduct.id, editForm, authToken);
      toast.success('Product updated successfully', {
        duration: 3000,
        position: 'bottom-right',
      });
      setEditingProduct(null);
      loadProducts(); // Refresh list
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };

  // Delete product
  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;

    try {
      await deleteProduct(deletingProduct.id, authToken);
      toast.success('Product deleted successfully', {
        duration: 3000,
        position: 'bottom-right',
      });
      setDeletingProduct(null);
      loadProducts(); // Refresh list
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product', {
        duration: 3000,
        position: 'bottom-right',
      });
    }
  };

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
      {loading ? (
        <GlassCard className="p-8 text-center text-slate-600">
          Loading products...
        </GlassCard>
      ) : (
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
                        className={product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                      >
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(product)}
                          className="text-slate-700 hover:text-blue-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="text-slate-700 hover:text-rose-600 transition-colors"
                        >
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
      )}

      <p className="text-slate-600 text-sm">
        Showing {filteredProducts.length} of {products.length} products
      </p>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Edit Product</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <Input
                    type="number"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <GlassButton
                onClick={() => setEditingProduct(null)}
                className="text-slate-600"
              >
                Cancel
              </GlassButton>
              <GlassButton
                onClick={handleSaveEdit}
                variant="primary"
                className="text-white"
              >
                Save Changes
              </GlassButton>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Product</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete <strong>{deletingProduct.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3">
                <GlassButton
                  onClick={() => setDeletingProduct(null)}
                  className="text-slate-600"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  onClick={handleDeleteConfirm}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Delete Product
                </GlassButton>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
