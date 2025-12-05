import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Mail, ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import { AppRoute } from '../types';
import { supabase } from '../services/supabase';

export const Auth: React.FC = () => {
  const login = useStore((state) => state.login);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  // Auth States: 'email_entry' | 'otp_verification'
  const [authStep, setAuthStep] = useState<'email_entry' | 'otp_verification'>('email_entry');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(AppRoute.DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAuthStep('otp_verification');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError("OTP is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('verify-otp', {
        body: { email, otp }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      // Success! Now sign in using the token returned
      if (data?.token) {
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          token: data.token,
          type: 'magiclink',
          email: email
        });

        if (authError) throw authError;

        if (authData.user) {
          login({
            id: authData.user.id,
            email: authData.user.email!,
            name: authData.user.user_metadata.name || email.split('@')[0],
            plan: 'free',
            avatar_url: authData.user.user_metadata.avatar_url
          });
          navigate(AppRoute.DASHBOARD);
        }
      } else {
        // Fallback if no token returned (shouldn't happen with current backend logic)
        setAuthStep('email_entry');
        setError("Verification successful, please sign in.");
      }

    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
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
            {authStep === 'email_entry' ? 'Welcome to ProjectPad' : 'Check your Email'}
          </h1>
          <p className="text-gray-400 text-sm">
            {authStep === 'email_entry'
              ? 'Sign in or create an account with your email'
              : `We've sent a 6-digit code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {authStep === 'email_entry' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="you@example.com"
                  required
                />
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Continue with Email'} <ArrowRight className="w-4 h-4" />
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
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Enter Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white text-center text-2xl tracking-[0.5em] focus:border-purple-500 focus:outline-none transition-colors"
                placeholder="000000"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-white text-black font-bold py-2.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'} <CheckCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-sm mt-4">
              <button
                type="button"
                onClick={() => setAuthStep('email_entry')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Change Email
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={resendCooldown > 0 || loading}
                className={`flex items-center gap-1 ${resendCooldown > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-purple-400 hover:text-purple-300'}`}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};