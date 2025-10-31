import { useState } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ShoppingBasket, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface SignupPageProps {
  onSignup: (email: string, password: string, name: string) => void;
  onBack: () => void;
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSignup, onBack, onSwitchToLogin }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match', {
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

    // Validate password strength (align with backend)
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPassword.test(password)) {
      toast.error('Password must be at least 8 characters with upper & lower case letters and a number', {
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

    onSignup(email, password, name);
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
                <h2 className="text-slate-900">Create Account</h2>
                <p className="text-slate-600">Sign up to get started</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

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
                    minLength={8}
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-500">
                    Must include at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/50 border-slate-300/50 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <GlassButton 
                  variant="primary" 
                  className="w-full text-white"
                  type="submit"
                >
                  Create Account
                </GlassButton>
              </form>

              <div className="text-center">
                <p className="text-slate-600 text-sm">
                  Already have an account?{' '}
                  <button 
                    onClick={onSwitchToLogin}
                    className="text-slate-800 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </GlassCard>

          <p className="text-slate-500 text-xs text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
