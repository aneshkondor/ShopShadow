import { ReactNode } from 'react';

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function GlassButton({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false,
  type
}: GlassButtonProps) {
  const variants = {
    primary: 'bg-slate-800/90 border-slate-700/50 hover:bg-slate-800 hover:shadow-[0_0_20px_rgba(30,41,59,0.3)]',
    secondary: 'bg-white/40 border-white/60 hover:bg-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]',
    success: 'bg-emerald-600/90 border-emerald-500/50 hover:bg-emerald-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    error: 'bg-rose-600/90 border-rose-500/50 hover:bg-rose-600 hover:shadow-[0_0_20px_rgba(225,29,72,0.3)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`
        backdrop-blur-[10px] border rounded-xl px-6 py-3
        transition-all duration-200
        min-h-[44px] min-w-[44px]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
