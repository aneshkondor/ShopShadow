import { motion } from 'motion/react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="backdrop-blur-[10px] bg-white/40 border border-white/60 rounded-full px-4 py-2 flex items-center gap-2">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.6)]'
        }`}
      />
      <span className="text-slate-700 text-sm">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}
