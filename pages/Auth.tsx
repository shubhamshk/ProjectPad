import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import { useStore } from '../store';
import { AppRoute } from '../types';
import { supabase } from '../services/supabase';

export const Auth: React.FC = () => {
  const login = useStore((state) => state.login);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          login({
            id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata.name || data.user.email!.split('@')[0],
            plan: 'free',
            avatar_url: data.user.user_metadata.avatar_url
          });
          navigate(AppRoute.DASHBOARD);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // For email confirmation flows, user might not be logged in immediately
          // But if auto-confirm is on, they will be.
          if (data.session) {
            login({
              id: data.user.id,
              email: data.user.email!,
              name: data.user.user_metadata.name || name,
              plan: 'free',
              avatar_url: data.user.user_metadata.avatar_url
            });
            navigate(AppRoute.DASHBOARD);
          } else {
            setError('Please check your email to confirm your account.');
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
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
            {isLogin ? 'Welcome to ProjectPad' : 'Create an Account'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Sign in to access your AI workspace' : 'Get started with your AI workspace'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#050505] text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-white cursor-pointer hover:underline focus:outline-none"
            >
              {isLogin ? 'Sign up for free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};