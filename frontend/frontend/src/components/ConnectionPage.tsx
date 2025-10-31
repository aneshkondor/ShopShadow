import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Input } from './ui/input';
import { Wifi, LogOut } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { connectDevice, storeDevice, type Device } from '../utils/api';

interface ConnectionPageProps {
  onConnect: (device: Device) => void;
  onLogout: () => void;
  isDemo?: boolean;
  authToken: string | null;
  userId: string | null;
}

export function ConnectionPage({ onConnect, onLogout, isDemo = false, authToken, userId }: ConnectionPageProps) {
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-submit when code is 4 digits
  useEffect(() => {
    if (code.length === 4 && !isConnecting) {
      handleConnect();
    }
  }, [code]);

  const handleCodeChange = (value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setCode(sanitized);

    if (error) {
      setError(null);
    }
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    handleCodeChange(pasted);
  };

  const handleConnect = async () => {
    if (code.length !== 4) {
      setError('Please enter a 4-digit code');
      return;
    }

    // Demo mode - use mock connection
    if (isDemo || !authToken) {
      if (code === '0000') {
        setIsConnecting(true);
        setTimeout(() => {
          setIsConnecting(false);
          toast.success('Demo device connected!', {
            duration: 3000,
            position: 'bottom-right',
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#1e293b',
            },
          });
          // Create mock device for demo
          const mockDevice: Device = {
            id: 'demo-device',
            name: 'Demo Device',
            status: 'connected',
            batteryLevel: 100,
            firmwareVersion: '1.0.0',
            lastHeartbeat: new Date().toISOString(),
          };
          onConnect(mockDevice);
        }, 1500);
      } else {
        setError('Demo code is 0000');
        toast.error('Invalid code. Use 0000 for demo.', {
          duration: 3000,
          position: 'bottom-right',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            color: '#1e293b',
          },
        });
      }
      return;
    }

    // Real connection with backend API
    setIsConnecting(true);
    setError(null);

    try {
      const device = await connectDevice(code, authToken);

      // Store device in localStorage
      storeDevice(device);

      toast.success(`Device connected! ID: ${device.id.slice(0, 8)}...`, {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#1e293b',
        },
      });

      onConnect(device);
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid code. Please try again.';
      setError(errorMessage);
      setCode(''); // Clear input
      toast.error('Connection failed', {
        duration: 3000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#1e293b',
        },
        description: errorMessage,
      });
    } finally {
      setIsConnecting(false);
    }
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

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Input
                      value={code}
                      onChange={(event) => handleCodeChange(event.target.value)}
                      onPaste={handleCodePaste}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleConnect();
                        }
                      }}
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={4}
                      autoFocus
                      disabled={isConnecting}
                      placeholder="0000"
                      className="w-44 text-center text-2xl tracking-[0.6em] font-semibold bg-white/70 border-slate-300/60 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  {error && (
                    <p className="text-rose-600 text-sm text-center">
                      {error}
                    </p>
                  )}

                  {isDemo && !error && (
                    <p className="text-slate-500 text-xs text-center">
                      Hint: Use code 0000 for demo
                    </p>
                  )}

                  {isConnecting && (
                    <p className="text-slate-600 text-sm text-center">
                      Connecting to device...
                    </p>
                  )}
                </div>
              </div>

              <GlassButton
                variant="primary"
                className="w-full text-white"
                disabled={code.length !== 4 || isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? 'Connecting…' : 'Connect Device'}
              </GlassButton>

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
