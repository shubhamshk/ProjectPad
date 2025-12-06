import React, { useState } from 'react';
import { X, Upload, MessageSquare, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { ImportedChat, ImportedMessage } from '../types';
import { useNavigate } from 'react-router-dom';

interface ImportChatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ImportChatModal: React.FC<ImportChatModalProps> = ({ isOpen, onClose }) => {
    const [url, setUrl] = useState('');
    const [step, setStep] = useState<'input' | 'preview' | 'processing'>('input');
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<{ title: string, messages: any[], provider: string } | null>(null);
    const navigate = useNavigate();

    if (!isOpen) return null;

    const detectProvider = (link: string) => {
        if (link.includes('chatgpt.com') || link.includes('openai.com')) return 'chatgpt';
        if (link.includes('gemini') || link.includes('bard')) return 'gemini';
        return 'other';
    };

    const handlePreview = async () => {
        if (!url) return;
        setStep('processing');
        setError(null);

        try {
            const provider = detectProvider(url);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session || !session.access_token) {
                throw new Error('Authentication session missing. Please refresh the page.');
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-shared-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ url, provider })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to fetch chat');
            }

            setPreviewData({ ...data, provider });
            setStep('preview');
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStep('input');
        }
    };

    const handleConfirm = async () => {
        if (!previewData) return;
        setStep('processing');

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session || !session.access_token) {
                throw new Error('Authentication session missing. New session required.');
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(previewData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Failed to populate DB');
            }

            onClose();
            // Navigate to the new imported chat view
            navigate(`/imported/${result.chatId}`);

        } catch (err: any) {
            setError(err.message);
            setStep('preview');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
            <div className="w-full h-full md:h-auto md:max-w-2xl bg-[#111] border-0 md:border border-white/10 md:rounded-2xl flex flex-col max-h-[100dvh] md:max-h-[90vh] shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        {/* Dynamic Logo based on provider if known, else generic */}
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                            <Upload size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Import Shared Chat</h2>
                            <p className="text-sm text-gray-400">Bring your conversations into ProjectPad</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                            <AlertTriangle size={18} />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-purple-500 mb-4" />
                            <p className="text-gray-400">Processing your request...</p>
                        </div>
                    )}

                    {step === 'input' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300">
                                Paste Share Authorization Link
                            </label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://chatgpt.com/share/..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                            />

                            <div className="bg-white/5 rounded-lg p-4 border border-white/5 text-sm text-gray-400">
                                <p className="mb-2 font-semibold text-gray-300">Supported Providers:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1">
                                    <li>ChatGPT (Public Share Links)</li>
                                    <li>Gemini (Public Share Links)</li>
                                </ul>
                                <div className="mt-4 flex items-start gap-2 pt-4 border-t border-white/5 text-xs text-gray-500">
                                    <input type="checkbox" id="consent" className="mt-0.5" />
                                    <label htmlFor="consent">
                                        I confirm that I have the right to import this conversation and it does not contain sensitive personal information or secrets.
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && previewData && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-white">{previewData.title}</h3>
                                <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-gray-400 capitalize">{previewData.provider}</span>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border border-white/5 rounded-lg p-4 bg-black/20">
                                {previewData.messages.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-purple-600/20 text-purple-100 rounded-tr-sm'
                                            : 'bg-white/5 text-gray-300 rounded-tl-sm'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-center text-xs text-gray-500">
                                Showing  {previewData.messages.length} messages. Click Import to save to your workspace.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-[#080808] rounded-b-2xl">
                    {step === 'input' && (
                        <button
                            onClick={handlePreview}
                            disabled={!url}
                            className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Preview Import
                        </button>
                    )}
                    {step === 'preview' && (
                        <>
                            <button
                                onClick={() => setStep('input')}
                                className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <Check size={16} /> Confirm Import
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};
