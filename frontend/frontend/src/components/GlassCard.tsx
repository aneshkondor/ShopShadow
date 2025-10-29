import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div
      className={`
        backdrop-blur-[20px] bg-white/40 border border-white/60 rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.5)]
        transition-all duration-300
        ${hover ? 'hover:bg-white/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:scale-[1.01]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
