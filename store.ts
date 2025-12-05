import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Project, ChatSession, Message, AIModelId, ApiKeys } from './types';
import { supabase } from './services/supabase';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  projects: Project[];
  currentProject: Project | null;
  chatSessions: Record<string, ChatSession>; // Keyed by project ID
  apiKeys: ApiKeys;

  // Actions
  login: (user: User) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateProfile: (name: string, avatarUrl?: string) => Promise<void>;

  fetchProjects: () => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  setCurrentProject: (projectId: string) => void;

  fetchSession: (projectId: string) => Promise<void>;
  setSessionModel: (projectId: string, modelId: AIModelId) => Promise<void>;
  saveMessage: (projectId: string, messageId: string) => Promise<void>;
  addMessage: (projectId: string, message: Message) => Promise<void>;
  updateLastMessage: (projectId: string, content: string) => void; // Streaming updates don't need DB save every chunk

  refreshUserCredits: () => Promise<void>;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ... (previous state)
      user: null,
      isAuthenticated: false,
      projects: [],
      currentProject: null,
      chatSessions: {},
      apiKeys: {},

      login: (user) => {
        set({ user, isAuthenticated: true });
        get().fetchProjects();
        // Trigger a re-fetch to ensure we have latest profile data if passed user object is incomplete
        get().checkSession();
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, projects: [], currentProject: null, chatSessions: {} });
      },

      checkSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Fetch project count
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id);

          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata.name || session.user.email!.split('@')[0],
            plan: profile?.plan || 'free',
            avatar_url: session.user.user_metadata.avatar_url,
            credits: profile?.credits ?? 300,
            monthly_project_creations: profile?.monthly_project_creations ?? 0,
            project_count: count || 0
          };
          set({ user, isAuthenticated: true });
          get().fetchProjects();
        } else {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateProfile: async (name, avatarUrl) => {
        const { data: { user }, error } = await supabase.auth.updateUser({
          data: { name, avatar_url: avatarUrl }
        });

        if (error) throw error;

        if (user) {
          set((state) => ({
            user: state.user ? { ...state.user, name, avatar_url: avatarUrl } : null
          }));
        }
      },

      fetchProjects: async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          return;
        }

        set({ projects: data as Project[] });
      },

      createProject: async (projectData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            ...projectData
          })
          .select()
          .single();

        if (error) throw error;

        set((state) => ({
          projects: [data as Project, ...state.projects],
          user: state.user ? {
            ...state.user,
            project_count: (state.user.project_count || 0) + 1,
            monthly_project_creations: (state.user.monthly_project_creations || 0) + 1
          } : null
        }));

        // Create initial chat session
        const sessionId = `chat-${data.id}`;
        await supabase.from('chat_sessions').insert({
          id: sessionId,
          project_id: data.id,
          selected_model: 'gemini-2.5-flash'
        });
      },

      setCurrentProject: (projectId) => {
        const project = get().projects.find(p => p.id === projectId) || null;
        set({ currentProject: project });
        if (project) {
          get().fetchSession(projectId);
        }
      },

      fetchSession: async (projectId) => {
        // Fetch session
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (sessionError && sessionError.code !== 'PGRST116') {
          console.error('Error fetching session:', sessionError);
          return;
        }

        let session = sessionData;

        // If no session exists (legacy projects), create one
        if (!session) {
          const sessionId = `chat-${projectId}`;
          const { data, error } = await supabase.from('chat_sessions').insert({
            id: sessionId,
            project_id: projectId,
            selected_model: 'gemini-2.5-flash'
          }).select().single();
          if (error) return;
          session = data;
        }

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', session.id)
          .order('timestamp', { ascending: true });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          return;
        }

        const chatSession: ChatSession = {
          id: session.id,
          projectId: session.project_id,
          selectedModel: session.selected_model as AIModelId,
          messages: (messagesData || []).map(m => ({
            id: m.id,
            role: m.role as any,
            content: m.content,
            timestamp: parseInt(m.timestamp)
          }))
        };

        set((state) => ({
          chatSessions: {
            ...state.chatSessions,
            [projectId]: chatSession
          }
        }));
      },

      setSessionModel: async (projectId, modelId) => {
        set((state) => {
          const session = state.chatSessions[projectId];
          if (!session) return state;
          return {
            chatSessions: {
              ...state.chatSessions,
              [projectId]: { ...session, selectedModel: modelId }
            }
          };
        });

        const session = get().chatSessions[projectId];
        if (session) {
          await supabase
            .from('chat_sessions')
            .update({ selected_model: modelId })
            .eq('id', session.id);
        }
      },

      addMessage: async (projectId, message) => {
        // Optimistic update
        set((state) => {
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
        });

        const session = get().chatSessions[projectId];
        if (session && !message.isStreaming) { // Don't save streaming placeholders immediately if empty
          await supabase.from('messages').insert({
            id: message.id,
            session_id: session.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp
          });
        }
      },

      saveMessage: async (projectId, messageId) => {
        const session = get().chatSessions[projectId];
        if (!session) return;

        const message = session.messages.find(m => m.id === messageId);
        if (!message) return;

        await supabase.from('messages').upsert({
          id: message.id,
          session_id: session.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp
        });
      },

      updateLastMessage: (projectId, content) => {
        set((state) => {
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
        });
      },

      refreshUserCredits: async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          set((state) => ({
            user: state.user ? { ...state.user, credits: profile.credits } : null
          }));
        }
      },

      setApiKey: (provider, key) => set((state) => ({
        apiKeys: { ...state.apiKeys, [provider]: key }
      }))
    }),
    {
      name: 'projectpad-storage',
      partialize: (state) => ({ apiKeys: state.apiKeys }), // Only persist API keys locally
    }
  )
);
