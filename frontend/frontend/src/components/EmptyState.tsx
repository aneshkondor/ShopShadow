import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { ShoppingBasket } from 'lucide-react';

export function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center min-h-[50vh] p-4"
    >
      <GlassCard className="w-full max-w-md p-12">
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-24 h-24 rounded-full bg-slate-800/10 backdrop-blur-sm flex items-center justify-center">
              <ShoppingBasket className="w-12 h-12 text-slate-600" />
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <h3 className="text-slate-900">No items detected yet</h3>
            <p className="text-slate-600">
              Place items in your smart basket to get started
            </p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
