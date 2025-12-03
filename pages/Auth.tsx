import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { AppRoute } from '../types';

export const Auth: React.FC = () => {
  const login = useStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login
    login({
      id: 'u-123',
      email: 'user@example.com',
      name: 'Demo User',
      plan: 'pro',
      avatar_url: 'https://picsum.photos/200'
    });
    navigate(AppRoute.DASHBOARD);
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
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to ProjectPad</h1>
          <p className="text-gray-400 text-sm">Sign in to access your AI workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              defaultValue="user@example.com"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              defaultValue="password"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-white text-black font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Don't have an account? <span className="text-white cursor-pointer hover:underline">Sign up for free</span>
          </p>
        </div>
      </div>
    </div>
  );
};