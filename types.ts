
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  avatar_url?: string;
  credits: number;
  monthly_project_creations: number;
  project_count: number; // Computed client-side or fetched
}

export interface Project {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  status: 'active' | 'archived' | 'completed';
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export type AIModelId =
  | 'gemini-2.5-flash'
  | 'gemini-3-pro-preview'
  | 'gpt-4o'
  | 'perplexity-sonar'
  | 'mistral-7b'
  | 'qwen-7b'
  | 'qwen-14b'
  | 'llama-3.1-8b'
  | 'deepseek-r1';

export interface ChatSession {
  id: string;
  projectId: string;
  messages: Message[];
  selectedModel: AIModelId;
}

export enum AppRoute {
  HOME = '/',
  LOGIN = '/login',
  DASHBOARD = '/dashboard',
  PROJECT = '/project/:id',
  SETTINGS = '/settings',
  BILLING = '/billing',
  PROFILE = '/profile',
  TERMS_OF_SERVICE = '/terms-of-service',
  IMPORTED = '/imported/:id'
}

export interface AIModelConfig {
  temperature: number;
  topK: number;
  topP: number;
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
  provider: 'chatgpt' | 'gemini' | 'other';
  source_url: string;
  title: string;
  summary_short?: string;
  summary_long?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ImportedMessage {
  id: string;
  imported_chat_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  original_index: number;
  created_at: string;
}
