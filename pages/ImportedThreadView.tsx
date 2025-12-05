import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ImportedChat, ImportedMessage } from '../types';
import { ArrowLeft, MessageSquare, Sparkles, Zap, List, FileText, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

export const ImportedThreadView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [chat, setChat] = useState<ImportedChat | null>(null);
    const [messages, setMessages] = useState<ImportedMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<string | null>(null);

    useEffect(() => {
        if (id) fetchChat(id);
    }, [id]);

    const fetchChat = async (chatId: string) => {
        try {
            const { data: chatData, error: chatError } = await supabase
                .from('imported_chats')
                .select('*')
                .eq('id', chatId)
                .single();

            if (chatError) throw chatError;
            setChat(chatData as ImportedChat);

            const { data: msgData, error: msgError } = await supabase
                .from('imported_messages')
                .select('*')
                .eq('imported_chat_id', chatId)
                .order('original_index', { ascending: true });

            if (msgError) throw msgError;
            setMessages(msgData as ImportedMessage[]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runMetaBrainAction = async (action: string) => {
        setAiActionLoading(action);
        setAiResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-brain-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ action, chatId: id })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            setAiResult(data.result);
        } catch (err) {
            console.error(err);
        } finally {
            setAiActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#050505]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!chat) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white">
                <p>Chat not found.</p>
                <button onClick={() => navigate('/dashboard')} className="mt-4 text-purple-400 hover:text-purple-300">Go Dashboard</button>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col bg-[#050505] text-white overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#080808]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold">{chat.title}</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">{chat.provider}</span>
                            <span>•</span>
                            <span>{new Date(chat.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors">
                        Original Link
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full border-r border-white/5">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-purple-600/20 text-purple-400' : 'bg-green-600/20 text-green-400'}`}>
                                    {msg.role === 'user' ? 'U' : <Sparkles size={14} />}
                                </div>
                                <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-purple-500/10 text-purple-50 rounded-tr-sm border border-purple-500/20'
                                            : 'bg-white/5 text-gray-300 rounded-tl-sm border border-white/5'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar - MetaBrain Actions */}
                <div className="w-80 bg-[#080808] border-l border-white/5 p-6 flex flex-col overflow-y-auto">
                    <div className="mb-6">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-400" /> MetaBrain
                        </h2>

                        <div className="space-y-3">
                            <button
                                onClick={() => runMetaBrainAction('summary')}
                                disabled={!!aiActionLoading}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-purple-500/30 transition-all text-left group"
                            >
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:text-blue-300">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-200">Summarize</span>
                                    <span className="block text-xs text-gray-500">Get a TL;DR</span>
                                </div>
                            </button>

                            <button
                                onClick={() => runMetaBrainAction('tasks')}
                                disabled={!!aiActionLoading}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-purple-500/30 transition-all text-left group"
                            >
                                <div className="p-2 bg-green-500/20 rounded-lg text-green-400 group-hover:text-green-300">
                                    <CheckCircle2 size={18} />
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-200">Extract Tasks</span>
                                    <span className="block text-xs text-gray-500">Find action items</span>
                                </div>
                            </button>

                            <button
                                onClick={() => runMetaBrainAction('analyze')}
                                disabled={!!aiActionLoading}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 hover:border-purple-500/30 transition-all text-left group"
                            >
                                <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 group-hover:text-orange-300">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <span className="block text-sm font-medium text-gray-200">Deep Analysis</span>
                                    <span className="block text-xs text-gray-500">Technical review</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* AI Output Area */}
                    {aiResult && (
                        <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 mt-2">
                            <div className="flex items-center gap-2 mb-2 text-purple-400 text-xs font-bold uppercase">
                                <Sparkles size={12} /> Result
                            </div>
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{aiResult}</p>
                        </div>
                    )}

                    {aiActionLoading && (
                        <div className="flex items-center justify-center py-8 text-gray-500 text-sm gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                            Processing...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
