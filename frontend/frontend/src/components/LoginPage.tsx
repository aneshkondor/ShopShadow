import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ShoppingBasket, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onBack: () => void;
  onSwitchToSignup: () => void;
}

export function LoginPage({ onLogin, onBack, onSwitchToSignup }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Logo */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
              <ShoppingBasket className="w-7 h-7 text-white" />
            </div>
            <span className="text-slate-800 text-2xl">Shop Shadow</span>
          </div>

          <GlassCard className="p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-slate-900">Welcome Back</h2>
                <p className="text-slate-600">Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <GlassButton 
                  variant="primary" 
                  className="w-full text-white"
                  type="submit"
                >
                  Sign In
                </GlassButton>
              </form>

              <div className="text-center">
                <p className="text-slate-600 text-sm">
                  Don't have an account?{' '}
                  <button 
                    onClick={onSwitchToSignup}
                    type="button"
                    className="text-slate-800 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </GlassCard>

          <p className="text-slate-500 text-xs text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
