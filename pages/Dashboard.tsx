
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { ImportChatModal } from '../components/ImportChatModal';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { generateProjectIdeas } from '../services/geminiService';

export const Dashboard: React.FC = () => {
  const { projects, user, createProject } = useStore();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const isLimitReached = user?.plan === 'free' && (
    (user?.project_count || 0) >= 3 ||
    (user?.monthly_project_creations || 0) >= 3
  );

  const handleQuickGen = async () => {
    if (isLimitReached) {
      setShowUpgrade(true);
      return;
    }
    if (!topic) return;
    setIsGenerating(true);
    try {
      const jsonStr = await generateProjectIdeas(topic);
      const ideas = JSON.parse(jsonStr);

      let description = "AI Generated Project";
      let tags = ['AI Generated'];

      if (ideas.length > 0) {
        description = ideas[0].description;
        tags = ideas[0].tags || tags;
      }

      const newProject = {
        title: topic, // Explicitly use user input as the title
        description: description,
        tags: tags,
        status: 'active' as const
      };
      await createProject(newProject);
      setTopic('');
    } catch (e) {
      console.error(e);
      // Fallback if AI fails, still respect the user's title
      const newProject = {
        title: topic,
        description: "New project workspace.",
        tags: ['New'],
        status: 'active' as const
      };
      await createProject(newProject);
      setTopic('');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{user?.name}</span>
          </h1>
          <p className="text-gray-400">You have {projects.length} active projects.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors"
          >
            Import
          </button>
          <button
            onClick={() => isLimitReached ? setShowUpgrade(true) : setTopic('New Project')}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium shadow-[0_0_20px_rgba(160,108,213,0.3)] transition-all flex items-center gap-2 ${isLimitReached ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-purple-600 hover:bg-purple-500'
              }`}
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </header>

      {/* Quick Generator */}
      <section className="mb-12">
        <GlassCard className="relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-32 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">AI Quick Start</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Create a new project</h3>
              <p className="text-gray-400 text-sm">Enter a name for your project, and we'll generate the initial context and structure.</p>
            </div>

            <div className="flex-1 w-full flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Project Name (e.g. Fitness Tracker)"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
              />
              <button
                onClick={handleQuickGen}
                disabled={isGenerating || !topic}
                className="bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <span className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>Create <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Projects Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Recent Projects</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <GlassCard
              key={project.id}
              hoverEffect={true}
              onClick={() => navigate(`/project/${project.id}`)}
              className="cursor-pointer group h-full flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-md bg-white/5 text-purple-400 border border-white/5">
                  <Sparkles size={20} />
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full border ${project.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-gray-500/30 text-gray-400'}`}>
                  {project.status.toUpperCase()}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                {project.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                {project.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={12} />
                  <span>2h ago</span>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-black flex items-center justify-center text-[10px] text-blue-400">AI</div>
                </div>
              </div>
            </GlassCard>
          ))}

          <button
            onClick={() => isLimitReached ? setShowUpgrade(true) : setTopic('New Project')}
            className="border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group h-full min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="text-sm font-medium">Create New Project</span>
          </button>

          {/* Upgrade Dialog */}
          {showUpgrade && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                <button
                  onClick={() => setShowUpgrade(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                  <Plus size={24} className="rotate-45" />
                </button>

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(160,108,213,0.4)]">
                    <Sparkles size={32} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h2>
                  <p className="text-gray-400">You've reached the limits of the Free plan.</p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                    <span>Unlimited projects</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                    <span>Unlimited monthly creations</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                    <span>Access to Gemini Pro & GPT-4</span>
                  </div>
                </div>

                <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                  Upgrade Now
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <ImportChatModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
    </div >
  );
};
