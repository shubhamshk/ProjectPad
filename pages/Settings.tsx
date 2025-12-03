
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { User, Shield, Key, Bell, Check, Eye, EyeOff, HelpCircle, X, ExternalLink, Zap, FileText } from 'lucide-react';
import { useStore } from '../store';
import { AnimatePresence, motion } from 'framer-motion';
import { AppRoute } from '../types';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, apiKeys, setApiKey, updateProfile } = useStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeHelp, setActiveHelp] = useState<'gemini' | 'openai' | 'perplexity' | 'huggingface' | null>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleShow = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEditClick = () => {
    setEditName(user?.name || '');
    setEditAvatar(user?.avatar_url || '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile(editName, editAvatar);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      <div className="grid gap-6">
        <GlassCard>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden border border-white/10">
              <img src={user?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{user?.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{user?.email}</p>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/20 font-mono">
                  PLAN: {user?.plan.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={handleEditClick}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white hover:bg-white/5 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </GlassCard>

        {/* ... existing sections ... */}

        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-4">AI Model Configuration</h2>

        <GlassCard>
          <div className="flex items-center gap-3 mb-4 text-white">
            <Key size={20} className="text-purple-400" />
            <h3 className="font-semibold">Provider API Keys</h3>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Manage your API keys to access different models. Keys are stored securely in your browser's local storage.
          </p>

          <div className="space-y-8">
            <ApiKeyInput
              label="Google Gemini API Key"
              placeholder="AIzaSy..."
              value={apiKeys.gemini || ''}
              isVisible={!!showKeys['gemini']}
              onToggle={() => toggleShow('gemini')}
              onChange={(val: string) => setApiKey('gemini', val)}
              onHelp={() => setActiveHelp('gemini')}
              desc="Required for Gemini Flash, Pro, and Meta-Brain features."
            />

            <div className="h-px bg-white/5" />

            <ApiKeyInput
              label="OpenAI API Key"
              placeholder="sk-..."
              value={apiKeys.openai || ''}
              isVisible={!!showKeys['openai']}
              onToggle={() => toggleShow('openai')}
              onChange={(val: string) => setApiKey('openai', val)}
              onHelp={() => setActiveHelp('openai')}
              desc="Required for GPT-4o chat."
            />

            <div className="h-px bg-white/5" />

            <ApiKeyInput
              label="Perplexity API Key"
              placeholder="pplx-..."
              value={apiKeys.perplexity || ''}
              isVisible={!!showKeys['perplexity']}
              onToggle={() => toggleShow('perplexity')}
              onChange={(val: string) => setApiKey('perplexity', val)}
              onHelp={() => setActiveHelp('perplexity')}
              desc="Required for Deep Research and Perplexity Sonar."
            />

            <div className="h-px bg-white/5" />

            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] px-2 py-1 rounded bg-green-500/20 text-green-400 font-bold">FREE</span>
              <span className="text-xs text-gray-400">No payment required</span>
            </div>

            <ApiKeyInput
              label="HuggingFace API Key"
              placeholder="hf_..."
              value={apiKeys.huggingface || ''}
              isVisible={!!showKeys['huggingface']}
              onToggle={() => toggleShow('huggingface')}
              onChange={(val: string) => setApiKey('huggingface', val)}
              onHelp={() => setActiveHelp('huggingface')}
              desc="Required for free models: Mistral 7B, Qwen, Llama 3.1, DeepSeek R1."
              badge="FREE"
            />
          </div>
        </GlassCard>

        {/* Legal & About Section */}
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-4">Legal & About</h2>

        <GlassCard>
          <button
            onClick={() => navigate(AppRoute.TERMS_OF_SERVICE)}
            className="w-full flex items-center justify-between gap-3 text-white hover:bg-white/5 transition-colors p-2 rounded-lg -m-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <FileText size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Terms of Service</h3>
                <p className="text-sm text-gray-400">View our terms and conditions</p>
              </div>
            </div>
            <ExternalLink size={18} className="text-gray-500" />
          </button>
        </GlassCard>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Avatar URL</label>
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-white text-black font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {activeHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveHelp(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setActiveHelp(null)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                  <Key size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Get {activeHelp === 'gemini' ? 'Google Gemini' : activeHelp === 'openai' ? 'OpenAI' : activeHelp === 'huggingface' ? 'HuggingFace (FREE)' : 'Perplexity'} API Key
                </h3>
                <p className="text-gray-400 text-sm">Follow these steps to generate a key.</p>
              </div>

              {activeHelp === 'gemini' ? (
                <div className="space-y-4">
                  <Step num={1} text="Go to Google AI Studio." />
                  <Step num={2} text="Click 'Get API Key' in the top-left corner." />
                  <Step num={3} text="Click 'Create API Key' in a new project." />
                  <Step num={4} text="Copy the key and paste it here." />
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 mt-4 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                  >
                    Go to Google AI Studio <ExternalLink size={14} />
                  </a>
                </div>
              ) : activeHelp === 'openai' ? (
                <div className="space-y-4">
                  <Step num={1} text="Log in to your OpenAI Platform account." />
                  <Step num={2} text="Navigate to the 'API Keys' section in the dashboard." />
                  <Step num={3} text="Click 'Create new secret key'." />
                  <Step num={4} text="Copy the key starting with 'sk-' and paste it here." />
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 mt-4 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                  >
                    Go to OpenAI Dashboard <ExternalLink size={14} />
                  </a>
                </div>
              ) : activeHelp === 'huggingface' ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-bold mb-1">
                      <Zap size={12} /> 100% FREE
                    </div>
                    <p className="text-[11px] text-gray-400">No credit card required. No usage limits for free tier.</p>
                  </div>
                  <Step num={1} text="Go to HuggingFace website and sign up (free)." />
                  <Step num={2} text="Navigate to Settings → Access Tokens." />
                  <Step num={3} text="Click 'New token' and select 'Read' permissions." />
                  <Step num={4} text="Copy the token starting with 'hf_' and paste it here." />
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 mt-4 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                  >
                    Go to HuggingFace Tokens <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <Step num={1} text="Log in to Perplexity.ai." />
                  <Step num={2} text="Go to Settings > API." />
                  <Step num={3} text="Ensure you have a payment method or credits added." />
                  <Step num={4} text="Generate a new API key and copy it here." />
                  <a
                    href="https://www.perplexity.ai/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 mt-4 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors text-sm"
                  >
                    Go to Perplexity Settings <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Step = ({ num, text }: { num: number, text: string }) => (
  <div className="flex gap-3 items-start">
    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
      {num}
    </div>
    <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
  </div>
);

const ApiKeyInput = ({ label, placeholder, value, isVisible, onToggle, onChange, onHelp, desc, badge }: any) => (
  <div>
    <div className="flex justify-between items-end mb-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-gray-200">{label}</label>
        {badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">{badge}</span>}
      </div>
      {value && <span className="text-[10px] text-green-400 flex items-center gap-1"><Check size={10} /> Saved</span>}
    </div>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-3 text-white text-sm font-mono focus:border-purple-500/50 focus:outline-none transition-all"
        />
        <button
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
    <div className="flex items-center justify-between mt-2">
      <p className="text-[11px] text-gray-500">{desc}</p>
      <button
        onClick={onHelp}
        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
      >
        <HelpCircle size={12} /> How to get key?
      </button>
    </div>
  </div>
);
