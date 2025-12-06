
export enum AppRoute {
    LOGIN = '/auth',
    DASHBOARD = '/dashboard',
    SETTINGS = '/settings',
    BILLING = '/billing',
    TERMS_OF_SERVICE = '/terms-of-service',
    IMPORTED = '/imported/:id'
}

export type AIModelId = 'gemini-pro' | 'gemini-1.5-pro' | 'gemini-2.5-flash' | 'gpt-4o' | 'perplexity-sonar' | 'huggingface-mistral';

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    plan: 'free' | 'pro' | 'premium';
    credits: number;
    project_count: number;
    monthly_project_creations: number;
}

export interface Project {
    id: string;
    user_id: string;
    title: string;
    description: string;
    tags?: string[];
    status: 'active' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
}

export interface ChatSession {
    id: string;
    projectId: string;
    selectedModel: AIModelId;
    messages: Message[];
}

export interface ApiKeys {
    gemini?: string;
    openai?: string;
    perplexity?: string;
    huggingface?: string;
}

export interface ImportedChat {
    id: string;
    user_id: string;
    title: string;
    provider: string;
    created_at: string;
    imported_at: string;
}

export interface ImportedMessage {
    id: string;
    imported_chat_id: string;
    role: 'user' | 'assistant';
    content: string;
    original_index: number;
}
