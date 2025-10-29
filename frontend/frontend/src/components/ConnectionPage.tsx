import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Wifi, LogOut } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ConnectionPageProps {
  onConnect: () => void;
  onLogout: () => void;
  isDemo?: boolean;
}

export function ConnectionPage({ onConnect, onLogout, isDemo = false }: ConnectionPageProps) {
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate code
    if (code !== '0000') {
      toast.error('Invalid connection code. Please try again.', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#1e293b',
        },
      });
      return;
    }

    setIsConnecting(true);
    
    // Simulate connection to Raspberry Pi
    setTimeout(() => {
      setIsConnecting(false);
      toast.success('Successfully connected to basket!', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#1e293b',
        },
      });
      onConnect();
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="absolute top-6 right-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>

      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <GlassCard className="p-8">
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
                  <Wifi className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-slate-900">Connect Your Basket</h2>
                  <p className="text-slate-600 mt-2">
                    {isDemo 
                      ? 'Enter code 0000 to try the demo' 
                      : 'Enter the code displayed on your smart basket'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-700">Connection Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Enter 4-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    maxLength={4}
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400 text-center text-2xl tracking-widest"
                  />
                  {isDemo && (
                    <p className="text-slate-500 text-xs text-center">
                      Hint: Use code 0000 for demo
                    </p>
                  )}
                </div>

                <GlassButton 
                  variant="primary" 
                  className="w-full text-white"
                  type="submit"
                  disabled={isConnecting || code.length !== 4}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </GlassButton>
              </form>

              <div className="pt-4 border-t border-slate-300/50">
                <p className="text-slate-600 text-sm text-center">
                  Make sure your basket is powered on and within range
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
