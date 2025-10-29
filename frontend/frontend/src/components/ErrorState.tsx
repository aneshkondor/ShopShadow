import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { WifiOff, Loader2 } from 'lucide-react';

interface ErrorStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorState({ onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[60vh] p-4"
    >
      <GlassCard className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-20 h-20 rounded-full bg-rose-100 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.2)]">
              <WifiOff className="w-12 h-12 text-rose-600" />
            </div>
          </motion.div>
          
          <div className="space-y-2">
            <h2 className="text-slate-900">Unable to Connect to Server</h2>
            <p className="text-slate-600">
              {isRetrying ? 'Reconnecting...' : 'Please check your connection and try again'}
            </p>
          </div>

          <GlassButton 
            variant="error" 
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full text-white"
          >
            {isRetrying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Reconnecting...
              </span>
            ) : (
              'Retry Connection'
            )}
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
