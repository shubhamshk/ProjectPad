
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Project, ChatSession, Message, AIModelId, ApiKeys } from './types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  projects: Project[];
  currentProject: Project | null;
  chatSessions: Record<string, ChatSession>; // Keyed by project ID
  apiKeys: ApiKeys;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  setCurrentProject: (projectId: string) => void;
  setSessionModel: (projectId: string, modelId: AIModelId) => void;
  addMessage: (projectId: string, message: Message) => void;
  updateLastMessage: (projectId: string, content: string) => void;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
}

// Mock initial data
const MOCK_USER: User = {
  id: 'u-123',
  email: 'demo@projectpad.ai',
  name: 'Alex Builder',
  plan: 'free',
  avatar_url: 'https://picsum.photos/200'
};

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p-1',
    title: 'Marketing Campaign Q4',
    description: 'AI-driven content generation for the upcoming holiday season.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['Marketing', 'Copywriting'],
    status: 'active'
  },
  {
    id: 'p-2',
    title: 'SaaS Dashboard React',
    description: 'Frontend boilerplate generation and component refinement.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: ['Dev', 'React'],
    status: 'active'
  }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      projects: [],
      currentProject: null,
      chatSessions: {},
      apiKeys: {},

      login: (user) => set({ user, isAuthenticated: true, projects: MOCK_PROJECTS }),
      logout: () => set({ user: null, isAuthenticated: false, projects: [], currentProject: null }),
      
      setProjects: (projects) => set({ projects }),
      
      addProject: (project) => set((state) => ({ 
        projects: [project, ...state.projects] 
      })),
      
      setCurrentProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId) || null;
        set({ currentProject: project });
        
        // Initialize chat session if not exists
        if (project && !get().chatSessions[projectId]) {
          set((state) => ({
            chatSessions: {
              ...state.chatSessions,
              [projectId]: {
                id: `chat-${projectId}`,
                projectId,
                messages: [
                  {
                    id: 'welcome',
                    role: 'model',
                    content: `Welcome to **${project.title}**! I'm ready to help.`,
                    timestamp: Date.now()
                  }
                ],
                selectedModel: 'gemini-2.5-flash'
              }
            }
          }));
        }
      },

      setSessionModel: (projectId, modelId) => set((state) => {
        const session = state.chatSessions[projectId];
        if (!session) return state;
        return {
          chatSessions: {
            ...state.chatSessions,
            [projectId]: { ...session, selectedModel: modelId }
          }
        };
      }),

      addMessage: (projectId, message) => set((state) => {
        const session = state.chatSessions[projectId];
        if (!session) return state;

        return {
          chatSessions: {
            ...state.chatSessions,
            [projectId]: {
              ...session,
              messages: [...session.messages, message]
            }
          }
        };
      }),

      updateLastMessage: (projectId, content) => set((state) => {
        const session = state.chatSessions[projectId];
        if (!session || session.messages.length === 0) return state;

        const messages = [...session.messages];
        const lastMsg = messages[messages.length - 1];
        
        messages[messages.length - 1] = {
          ...lastMsg,
          content,
          isStreaming: false
        };

        return {
          chatSessions: {
            ...state.chatSessions,
            [projectId]: {
              ...session,
              messages
            }
          }
        };
      }),

      setApiKey: (provider, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key }
      }))
    }),
    {
      name: 'projectpad-storage',
      partialize: (state) => ({ apiKeys: state.apiKeys, projects: state.projects, chatSessions: state.chatSessions }),
    }
  )
);
