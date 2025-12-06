
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Send, Cpu, Paperclip, MoreVertical, Maximize2,
  Search, X, Sparkles, Zap, BrainCircuit, ChevronDown, Check, ArrowRight,
  Globe, Bot, Key
} from 'lucide-react';
import { useStore } from '../store';
import { Message, AIModelId } from '../types';
import { generateProjectChatResponse, generateMetaInsight } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

// --- Custom Markdown Components for "Clean" Aesthetics ---
const MarkdownComponents = {
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0 leading-7 text-[15px] font-normal text-gray-200" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-300" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-300" {...props} />,
  li: ({ node, ...props }: any) => <li className="leading-7 text-[15px] pl-1" {...props} />,
  h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold mt-6 mb-3 text-white border-b border-white/10 pb-2" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold mt-5 mb-3 text-white" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-base font-semibold mt-4 mb-2 text-purple-200" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-white" {...props} />,
  a: ({ node, ...props }: any) => <a className="text-purple-400 hover:underline" target="_blank" rel="noreferrer" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline) {
      return <code className="bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono text-purple-300" {...props}>{children}</code>;
    }
    return (
      <div className="rounded-lg overflow-hidden my-4 border border-white/10 bg-[#0F0F0F] shadow-lg">
        <div className="bg-white/5 px-3 py-2 border-b border-white/5 text-[10px] text-gray-500 font-mono flex items-center gap-2 select-none">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/30" />
          </div>
          <span className="ml-2 opacity-50">CODE BLOCK</span>
        </div>
        <pre className="p-4 overflow-x-auto text-sm text-gray-300 font-mono leading-relaxed bg-[#0a0a0a]">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  blockquote: ({ node, ...props }: any) => <blockquote className="border-l-2 border-purple-500/50 pl-4 italic text-gray-400 my-4 bg-white/[0.02] py-2 pr-2 rounded-r" {...props} />
};

export const ProjectChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { projects, setCurrentProject, chatSessions, addMessage, updateLastMessage, setSessionModel, apiKeys, setApiKey, saveMessage, user, refreshUserCredits } = useStore();

  // UI State
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // API Key Enforcement State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [missingProvider, setMissingProvider] = useState<keyof typeof apiKeys | null>(null);
  const [tempKey, setTempKey] = useState('');

  // Meta Chat State
  const [isMetaOpen, setIsMetaOpen] = useState(false);
  const [metaInput, setMetaInput] = useState('');
  const [metaResponse, setMetaResponse] = useState<string | null>(null);
  const [isMetaThinking, setIsMetaThinking] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      setCurrentProject(id);
    }
  }, [id, setCurrentProject]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const project = projects.find(p => p.id === id);
  const session = id ? chatSessions[id] : null;
  const messages = session?.messages || [];
  const selectedModel = session?.selectedModel || 'gemini-2.5-flash';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll if not searching/filtering
    if (!searchQuery) {
      scrollToBottom();
    }
  }, [messages, searchQuery]);

  // --- Handlers ---

  const getProviderForModel = (modelId: AIModelId): keyof typeof apiKeys => {
    if (modelId.startsWith('gemini')) return 'gemini';
    if (modelId.startsWith('gpt')) return 'openai';
    if (modelId.startsWith('perplexity')) return 'perplexity';
    return 'huggingface'; // mistral, qwen, llama, deepseek
  };

  const handleSend = async () => {
    if (!input.trim() || !id) return;

    // Credit Check (Client-side pre-check only, real check is on server)
    if (user?.plan === 'free' && (user?.credits || 0) < 25) {
      alert("Insufficient credits. Please upgrade to Pro.");
      return;
    }

    // Check API Key - No longer needed for server-side calls if we use server keys, 
    // but if we are using user keys passed to server, we might keep it.
    // The new Edge Function implementation currently assumes server-side keys for Gemini.
    // Let's keep the check if the user is on a plan that requires their own key (e.g. BYOK), 
    // but for the "Credit System" (Free/Pro), we usually provide the key.
    // The prompt implies "Free tier ended — Upgrade to Pro". 
    // Let's assume for this "Credit System" mode, we don't need the user's key for the default models.
    // However, to avoid breaking existing "BYOK" functionality if that's what "Pro" means here...
    // Actually, the prompt says "Upgrade to Pro" to continue using credits? Or to get unlimited?
    // "If credits < 25, user cannot perform chat actions... Upgrade to Pro".
    // This implies Pro has unlimited or more credits.
    // Let's remove the strict API key check for the default model if we are using the credit system.
    // But for now, to be safe and minimal, I'll just remove the DB update logic.

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    addMessage(id, userMsg);
    setInput('');
    setIsTyping(true);

    const aiMsgId = (Date.now() + 1).toString();
    const aiPlaceholder: Message = {
      id: aiMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    };
    addMessage(id, aiPlaceholder);

    try {
      const history = messages;
      await generateProjectChatResponse(
        history,
        userMsg.content,
        selectedModel,
        (chunk) => {
          updateLastMessage(id, chunk);
          if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            if (scrollHeight - scrollTop - clientHeight < 100) {
              scrollToBottom();
            }
          }
        }
      );
      // Save the final message to DB
      await saveMessage(id, aiMsgId);
      // Refresh credits to show updated balance in sidebar
      await refreshUserCredits();
    } catch (error) {
      console.error("Chat Error", error);
      updateLastMessage(id, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveApiKey = () => {
    if (missingProvider && tempKey) {
      setApiKey(missingProvider, tempKey);
      setShowApiKeyModal(false);
      setTempKey('');
      // Optionally auto-send message here, but user might want to review
    }
  };

  const handleMetaAnalysis = async (customQuery?: string) => {
    if (!id || !session) return;

    // Meta brain uses Gemini
    if (!apiKeys.gemini) {
      setMissingProvider('gemini');
      setShowApiKeyModal(true);
      return;
    }

    setIsMetaThinking(true);
    setMetaResponse(null);

    const query = customQuery || "Summarize the key technical decisions and current status of this project.";

    try {
      const insight = await generateMetaInsight(session.messages, query);
      setMetaResponse(insight);
    } catch (e) {
      setMetaResponse("Failed to analyze project.");
    } finally {
      setIsMetaThinking(false);
    }
  };

  const getModelLabel = (id: AIModelId) => {
    switch (id) {
      case 'gemini-2.5-flash': return 'Gemini Flash';
      case 'gemini-3-pro-preview': return 'Gemini Pro';
      case 'gpt-4o': return 'GPT-4o';
      case 'perplexity-sonar': return 'Perplexity';
      case 'mistral-7b': return 'Mistral 7B';
      case 'qwen-7b': return 'Qwen 7B';
      case 'qwen-14b': return 'Qwen 14B';
      case 'llama-3.1-8b': return 'Llama 3.1 8B';
      case 'deepseek-r1': return 'DeepSeek R1';
      default: return 'AI Model';
    }
  };

  const getModelIcon = (id: AIModelId) => {
    switch (id) {
      case 'gemini-2.5-flash': return <Zap size={12} className="text-yellow-400" />;
      case 'gemini-3-pro-preview': return <Sparkles size={12} className="text-purple-400" />;
      case 'gpt-4o': return <Bot size={12} className="text-green-400" />;
      case 'perplexity-sonar': return <Globe size={12} className="text-blue-400" />;
      case 'mistral-7b': return <Bot size={12} className="text-orange-400" />;
      case 'qwen-7b': return <Bot size={12} className="text-cyan-400" />;
      case 'qwen-14b': return <Bot size={12} className="text-cyan-500" />;
      case 'llama-3.1-8b': return <Bot size={12} className="text-pink-400" />;
      case 'deepseek-r1': return <Bot size={12} className="text-indigo-400" />;
      default: return <Sparkles size={12} />;
    }
  };

  // --- Filtered Messages ---
  const displayedMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  if (!project) return <div className="p-8 text-center text-gray-500">Project not found</div>;

  return (
    <div className="flex h-full relative overflow-hidden bg-[#050505]">

      {/* Main Chat Area */}
      <div className={`flex flex-col flex-1 relative transition-all duration-300 ${isMetaOpen ? 'mr-0 lg:mr-[400px]' : ''}`}>

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md z-20 sticky top-0">
          <div className="flex items-center gap-4 flex-1">
            {!isSearchOpen ? (
              <>
                <div>
                  <h1 className="text-base font-bold text-white flex items-center gap-2">
                    {project.title}
                  </h1>
                  <p className="text-[11px] text-gray-500 truncate max-w-xs uppercase tracking-wide">
                    {project.status} • {messages.length} messages
                  </p>
                </div>

                {/* Model Selector */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all text-xs font-medium text-gray-300 hover:text-white"
                  >
                    {getModelIcon(selectedModel)}
                    {getModelLabel(selectedModel)}
                    <ChevronDown size={12} className="opacity-50" />
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showModelSelector && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowModelSelector(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 mt-2 w-80 bg-[#111] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-2 z-50 flex flex-col gap-1 ring-1 ring-white/5 max-h-[60vh] overflow-y-auto"
                        >
                          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">Google Gemini</div>
                          <ModelOption
                            id="gemini-2.5-flash"
                            name="Gemini 2.5 Flash"
                            desc="Fastest, low latency"
                            icon={<Zap size={14} className="text-yellow-400" />}
                            selected={selectedModel === 'gemini-2.5-flash'}
                            onClick={(id) => {
                              if (user?.plan === 'free') {
                                alert("Upgrade to Pro to use Gemini models.");
                                return;
                              }
                              if (id) setSessionModel(project.id, id);
                              setShowModelSelector(false);
                            }}
                            badge={user?.plan === 'free' ? 'PRO' : undefined}
                          />
                          <ModelOption
                            id="gemini-3-pro-preview"
                            name="Gemini 3 Pro"
                            desc="High reasoning & thinking"
                            icon={<Sparkles size={14} className="text-purple-400" />}
                            selected={selectedModel === 'gemini-3-pro-preview'}
                            onClick={(id) => {
                              if (user?.plan === 'free') {
                                alert("Upgrade to Pro to use Gemini models.");
                                return;
                              }
                              if (id) setSessionModel(project.id, id);
                              setShowModelSelector(false);
                            }}
                            badge={user?.plan === 'free' ? 'PRO' : undefined}
                          />

                          <div className="h-px bg-white/5 my-1" />
                          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase">External Providers</div>

                          <ModelOption
                            id="gpt-4o"
                            name="GPT-4o"
                            desc="OpenAI Flagship"
                            icon={<Bot size={14} className="text-green-400" />}
                            selected={selectedModel === 'gpt-4o'}
                            onClick={(id) => {
                              if (user?.plan === 'free') {
                                alert("Upgrade to Pro to use GPT-4o.");
                                return;
                              }
                              if (id) setSessionModel(project.id, id);
                              setShowModelSelector(false);
                            }}
                            badge={user?.plan === 'free' ? 'PRO' : undefined}
                          />
                          <ModelOption
                            id="perplexity-sonar"
                            name="Perplexity Sonar"
                            desc="Deep Research"
                            icon={<Globe size={14} className="text-blue-400" />}
                            selected={selectedModel === 'perplexity-sonar'}
                            onClick={(id) => {
                              if (user?.plan === 'free') {
                                alert("Upgrade to Pro to use Perplexity.");
                                return;
                              }
                              if (id) setSessionModel(project.id, id);
                              setShowModelSelector(false);
                            }}
                            badge={user?.plan === 'free' ? 'PRO' : undefined}
                          />

                          <div className="h-px bg-white/5 my-1" />
                          <div className="px-3 py-2 text-[10px] font-bold text-green-500 uppercase flex items-center gap-1">
                            🆓 Free Open-Source Models
                          </div>

                          <ModelOption
                            id="mistral-7b"
                            name="Mistral 7B"
                            desc="FREE • HuggingFace"
                            icon={<Bot size={14} className="text-orange-400" />}
                            selected={selectedModel === 'mistral-7b'}
                            onClick={(id) => { if (id) setSessionModel(project.id, id); setShowModelSelector(false); }}
                            badge="FREE"
                          />
                          <ModelOption
                            id="qwen-7b"
                            name="Qwen 7B"
                            desc="FREE • HuggingFace"
                            icon={<Bot size={14} className="text-cyan-400" />}
                            selected={selectedModel === 'qwen-7b'}
                            onClick={(id) => { if (id) setSessionModel(project.id, id); setShowModelSelector(false); }}
                            badge="FREE"
                          />
                          <ModelOption
                            id="qwen-14b"
                            name="Qwen 14B"
                            desc="FREE • Larger model"
                            icon={<Bot size={14} className="text-cyan-500" />}
                            selected={selectedModel === 'qwen-14b'}
                            onClick={(id) => { if (id) setSessionModel(project.id, id); setShowModelSelector(false); }}
                            badge="FREE"
                          />
                          <ModelOption
                            id="llama-3.1-8b"
                            name="Llama 3.1 8B"
                            desc="FREE • Meta AI"
                            icon={<Bot size={14} className="text-pink-400" />}
                            selected={selectedModel === 'llama-3.1-8b'}
                            onClick={(id) => { if (id) setSessionModel(project.id, id); setShowModelSelector(false); }}
                            badge="FREE"
                          />
                          <ModelOption
                            id="deepseek-r1"
                            name="DeepSeek R1"
                            desc="FREE • Reasoning model"
                            icon={<Bot size={14} className="text-indigo-400" />}
                            selected={selectedModel === 'deepseek-r1'}
                            onClick={(id) => { if (id) setSessionModel(project.id, id); setShowModelSelector(false); }}
                            badge="FREE"
                          />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              /* Search Bar */
              <div className="flex items-center gap-3 flex-1 animate-in fade-in slide-in-from-left-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                <Search size={16} className="text-purple-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discussion history..."
                  className="bg-transparent border-none focus:outline-none text-white w-full placeholder-gray-600 text-sm"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 text-gray-400">
            {isSearchOpen ? (
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="hover:text-white p-2 bg-white/5 rounded-full"><X size={16} /></button>
            ) : (
              <button onClick={() => setIsSearchOpen(true)} className="hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"><Search size={18} /></button>
            )}

            <div className="h-6 w-px bg-white/10 mx-2" />

            <button
              onClick={() => setIsMetaOpen(!isMetaOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isMetaOpen ? 'bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(160,108,213,0.2)]' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400 hover:text-white'}`}
            >
              <BrainCircuit size={18} />
              <span className="text-xs font-bold hidden md:block">Meta-Brain</span>
            </button>
          </div>
        </header>

        {/* Chat Stream */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth"
        >
          {displayedMessages.length === 0 && searchQuery && (
            <div className="text-center text-gray-500 mt-20">No messages found matching "{searchQuery}"</div>
          )}

          {displayedMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-5 max-w-4xl mx-auto group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${msg.role === 'user' ? 'bg-white text-black' : 'bg-[#1a1a1a] border border-white/10 shadow-lg shadow-black/50'}`}>
                {msg.role === 'user' ? <span className="text-sm font-bold">U</span> : <Cpu size={18} className="text-purple-400" />}
              </div>

              <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`
                    relative px-6 py-5 rounded-2xl shadow-sm text-base
                    ${msg.role === 'user'
                      ? 'bg-white text-[#0a0a0a] font-normal rounded-tr-sm'
                      : 'bg-white/[0.03] border border-white/5 text-gray-200 rounded-tl-sm backdrop-blur-sm'}
                    ${searchQuery && msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ? 'ring-2 ring-yellow-500/50' : ''}
                  `}
                >
                  {msg.role === 'model' ? (
                    <div className="font-sans">
                      <ReactMarkdown components={MarkdownComponents}>{msg.content}</ReactMarkdown>
                      {msg.isStreaming && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1 align-middle rounded-full" />}
                    </div>
                  ) : (
                    <p className="leading-7 whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                <span className="text-[10px] text-gray-600 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 md:p-6 border-t border-white/5 bg-[#050505]">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute left-3 top-3 md:left-4 md:top-4 flex items-center gap-3 border-r border-white/10 pr-3">
              <button className="text-gray-500 hover:text-white transition-colors">
                <Paperclip size={18} />
              </button>
            </div>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Ask ${getModelLabel(selectedModel)}...`}
              className="w-full bg-[#121212] border border-white/10 rounded-xl py-3 md:py-4 pl-16 md:pl-20 pr-12 md:pr-14 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/40 transition-all shadow-inner text-sm"
            />

            <div className="absolute right-2 top-2">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTyping ? <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" /> : <Send size={18} />}
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-2 text-center flex justify-between px-4">
            <p className="text-[10px] text-gray-600">Using <strong>{getModelLabel(selectedModel)}</strong>. AI can make mistakes.</p>
            <p className="text-[10px] text-gray-600">Cost: <strong>25 Credits</strong> / msg</p>
          </div>
        </div>
      </div>

      {/* Meta-Chatbot Sidebar */}
      <div
        className={`
          absolute top-16 right-0 bottom-0 w-full md:w-[450px] 
          bg-[#0A0A0A]/95 backdrop-blur-3xl border-l border-white/10 
          transform transition-transform duration-300 z-30 flex flex-col shadow-2xl
          ${isMetaOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-purple-900/5">
          <div>
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <BrainCircuit size={20} />
              <h2 className="font-bold text-white text-lg">Project Meta-Brain</h2>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">DEEP ANALYSIS ENGINE</p>
          </div>
          <button onClick={() => setIsMetaOpen(false)} className="text-gray-500 hover:text-white p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {!metaResponse && !isMetaThinking && (
            <div className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 border border-purple-500/10 rounded-xl p-5 mb-8">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" /> Context Aware
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                This AI reads all {messages.length} messages (including <strong>GPT</strong> and <strong>Perplexity</strong> responses) to synthesize answers, summarize decisions, and provide context-aware reasoning.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          {!metaResponse && !isMetaThinking && (
            <div className="grid grid-cols-2 gap-3 mb-8">
              <QuickAction
                label="Generate Summary"
                sub="Status & Key Points"
                onClick={() => handleMetaAnalysis("Summarize the project status, key decisions, and pending items in a structured format.")}
              />
              <QuickAction
                label="Extract Decisions"
                sub="Technical Choices"
                onClick={() => handleMetaAnalysis("List all technical decisions and architectural choices made in this chat so far.")}
              />
              <QuickAction
                label="Find TODOs"
                sub="Pending Tasks"
                onClick={() => handleMetaAnalysis("Extract a checklist of all pending tasks and TODOs mentioned in the conversation.")}
              />
              <QuickAction
                label="Code Review"
                sub="Analyze snippets"
                onClick={() => handleMetaAnalysis("Review the code snippets shared in this chat and suggest improvements or identify patterns.")}
              />
            </div>
          )}

          {/* Result Area */}
          <div className="min-h-[200px]">
            {isMetaThinking ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-purple-500/30 rounded-full animate-ping absolute" />
                  <div className="w-12 h-12 border-2 border-purple-500 rounded-full animate-spin border-t-transparent" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-purple-300 animate-pulse block">ANALYZING CONTEXT</span>
                  <span className="text-[10px] text-gray-600">Reading {messages.length} messages...</span>
                </div>
              </div>
            ) : metaResponse ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-purple-900/50">AI</div>
                    <span className="text-xs font-bold text-gray-300">Analysis Result</span>
                  </div>
                  <button onClick={() => setMetaResponse(null)} className="text-[10px] text-gray-500 hover:text-white underline">Clear</button>
                </div>
                <div className="prose prose-invert prose-sm text-sm bg-white/[0.03] p-6 rounded-xl border border-white/5 shadow-inner">
                  <ReactMarkdown components={MarkdownComponents}>{metaResponse}</ReactMarkdown>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Meta Input */}
        <div className="p-4 border-t border-white/5 bg-[#0a0a0a]">
          <div className="relative">
            <input
              value={metaInput}
              onChange={(e) => setMetaInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleMetaAnalysis(metaInput)}
              placeholder="Ask a question about the project history..."
              className="w-full bg-[#151515] border border-white/10 rounded-lg py-3.5 pl-4 pr-12 text-sm text-white focus:border-purple-500/50 focus:outline-none focus:bg-[#1a1a1a] transition-all"
            />
            <button
              onClick={() => handleMetaAnalysis(metaInput)}
              disabled={!metaInput || isMetaThinking}
              className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApiKeyModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Key size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">API Key Required</h3>
                    <p className="text-xs text-gray-400">Enter your {missingProvider} key to continue</p>
                  </div>
                </div>
                <button onClick={() => setShowApiKeyModal(false)} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  You need to provide a valid API key for <strong>{missingProvider?.toUpperCase()}</strong> to use this model.
                  The key will be stored securely in your browser.
                </p>

                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder={`Enter ${missingProvider} API Key...`}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors font-mono text-sm"
                />

                <button
                  onClick={handleSaveApiKey}
                  disabled={!tempKey}
                  className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Save & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuickAction = ({ label, sub, onClick }: any) => (
  <button
    onClick={onClick}
    className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 text-left transition-all group flex flex-col justify-center h-20"
  >
    <span className="text-sm font-bold text-gray-200 group-hover:text-purple-400 transition-colors mb-1">{label}</span>
    <span className="text-[10px] text-gray-500">{sub}</span>
  </button>
);

const ModelOption = ({ id, name, desc, icon, selected, onClick, badge }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`
      w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left
      ${selected ? 'bg-white/10' : 'hover:bg-white/5'}
    `}
  >
    <div className={`p-2 rounded-md ${selected ? 'bg-white/10 text-white' : 'bg-black/40 text-gray-400'}`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-300'}`}>{name}</span>
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">{badge}</span>}
        </div>
        {selected && <Check size={14} className="text-purple-400" />}
      </div>
      <span className="text-[10px] text-gray-500">{desc}</span>
    </div>
  </button>
);
