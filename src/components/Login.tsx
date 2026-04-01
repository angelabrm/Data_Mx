import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (rfc: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
  const [rfc, setRfc] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rfc.trim()) {
      onLogin(rfc);
    }
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(circle at 20% 20%, #1a2a6c, #0b1020 60%)"
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8 space-y-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-blue-400/30 mb-6">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ORBIT</h1>
          <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] font-bold mt-2">
            Organizational Report of Business Insights and Trends
          </p>
          <p className="text-white/60 text-sm mt-6">Enter your RFC to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              RFC (Documento)
            </label>
            <input
              type="text"
              value={rfc}
              onChange={(e) => setRfc(e.target.value)}
              placeholder="Enter your RFC"
              className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all opacity-50 cursor-not-allowed"
              disabled
            />
            <p className="text-[10px] text-blue-400/60 italic">Password functionality coming soon</p>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-xs text-center font-medium"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center w-full h-12 px-4 py-2 text-sm font-bold tracking-wide transition-all rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                SIGN IN
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
