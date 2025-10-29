import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { ShoppingBasket, Zap, Shield, Smartphone, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onTryDemo: () => void;
}

export function LandingPage({ onLogin, onTryDemo }: LandingPageProps) {
  const features = [
    {
      icon: Zap,
      title: 'Instant Detection',
      description: 'Real-time item recognition as you shop'
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Bank-level encryption for all transactions'
    },
    {
      icon: Smartphone,
      title: 'Smart Integration',
      description: 'Seamlessly connects to your basket hardware'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6"
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow-lg">
              <ShoppingBasket className="w-6 h-6 text-white" />
            </div>
            <span className="text-slate-800">Shop Shadow</span>
          </div>
          <GlassButton variant="secondary" onClick={onLogin} className="text-slate-700">
            Sign In
          </GlassButton>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto w-full">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-slate-900 text-4xl sm:text-6xl">
                Shopping, <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-500">Reimagined</span>
              </h1>
              <p className="text-slate-600 text-lg sm:text-xl max-w-2xl mx-auto">
                Experience the future of retail with Shop Shadow. Your smart basket system that tracks items in real-time and streamlines checkout.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <GlassButton 
                variant="primary" 
                onClick={onLogin}
                className="text-white px-8 py-4 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </GlassButton>
              <GlassButton 
                variant="secondary" 
                onClick={onTryDemo}
                className="text-slate-700 px-8 py-4"
              >
                Try Demo
              </GlassButton>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <GlassCard hover className="p-6 h-full">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-800/10 flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-slate-700" />
                      </div>
                      <h3 className="text-slate-800">{feature.title}</h3>
                      <p className="text-slate-600 text-sm">{feature.description}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-slate-500 text-sm">© 2025 Shop Shadow. All rights reserved.</p>
      </footer>
    </div>
  );
}
