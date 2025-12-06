import React from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { Check } from 'lucide-react';

export const Billing: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-4">Upgrade your Workspace</h1>
        <p className="text-gray-400">Unlock advanced AI models, unlimited projects, and team collaboration.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Free Plan */}
        <GlassCard className="flex flex-col">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">Starter</h3>
            <p className="text-2xl font-bold text-white mt-2">$0 <span className="text-sm text-gray-500 font-normal">/mo</span></p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            <Feature text="3 Active Projects" />
            <Feature text="Gemini Flash Access" />
            <Feature text="Community Support" />
          </ul>
          <button className="w-full py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 text-sm font-medium">
            Current Plan
          </button>
        </GlassCard>

        {/* Pro Plan */}
        <GlassCard className="flex flex-col relative border-purple-500/30 bg-purple-500/5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Popular
          </div>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">Pro</h3>
            <p className="text-2xl font-bold text-white mt-2">$9 <span className="text-sm text-gray-500 font-normal">/mo</span></p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            <Feature text="Unlimited Projects" />
            <Feature text="Gemini Pro 1.5 Access" />
            <Feature text="Priority Support" />
            <Feature text="Advanced Analytics" />
          </ul>
          <button className="w-full py-2 rounded-lg bg-white text-black hover:bg-gray-200 text-sm font-bold shadow-lg shadow-purple-500/20">
            Upgrade to Pro
          </button>
        </GlassCard>

        {/* Premium Plan */}
        <GlassCard className="flex flex-col border-amber-500/20">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white">Premium</h3>
            <p className="text-2xl font-bold text-white mt-2">$29 <span className="text-sm text-gray-500 font-normal">/mo</span></p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            <Feature text="Everything in Pro" />
            <Feature text="Video Generation (Veo)" />
            <Feature text="Advanced Models (Claude/GPT-4)" />
            <Feature text="Dedicated Account Manager" />
          </ul>
          <button className="w-full py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 text-sm font-medium">
            Contact Sales
          </button>
        </GlassCard>
      </div>
    </div>
  );
};

const Feature = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-sm text-gray-300">
    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 flex-shrink-0">
      <Check size={12} />
    </div>
    {text}
  </li>
);