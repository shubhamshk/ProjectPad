import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import { useStore } from '../store';
import { AppRoute } from '../types';
import { supabase } from '../services/supabase';

export const Auth: React.FC = () => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(AppRoute.DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md relative z-10 backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(160,108,213,0.4)]">
            <span className="font-bold text-white text-xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to ProjectPad
          </h1>
          <p className="text-gray-400 text-sm">
            Sign in to continue
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <button
            type="button"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
};