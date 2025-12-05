
import { GoogleGenAI } from "@google/genai";
import { Message, AIModelId } from '../types';
import { useStore } from '../store';
import { supabase } from './supabase';

// Helper to get Gemini Client with dynamic key
const getGeminiClient = () => {
  const key = useStore.getState().apiKeys.gemini;

  if (!key) {
    throw new Error("Gemini API Key missing. Please add it in Settings.");
  }

  return new GoogleGenAI({ apiKey: key });
};

// --- Unified Chat Gateway ---

// --- Unified Chat Gateway ---

export const generateProjectChatResponse = async (
  history: Message[],
  prompt: string,
  modelId: AIModelId,
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    // Determine which API key to use based on model
    const apiKeys = useStore.getState().apiKeys;
    let apiKey: string | undefined;

    if (modelId.startsWith('gemini')) {
      apiKey = apiKeys.gemini;
    } else if (modelId.startsWith('gpt')) {
      apiKey = apiKeys.openai;
    } else if (modelId.startsWith('perplexity')) {
      apiKey = apiKeys.perplexity;
    } else {
      // HuggingFace models (mistral, qwen, llama, deepseek)
      apiKey = apiKeys.huggingface;
    }

    // Call the secure Edge Function
    const response = await fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/invoke-chat-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        messages: [...history, { role: 'user', content: prompt }],
        modelId,
        projectId: 'current-project',
        apiKey // Pass the user's API key for the selected model
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate response');
    }

    const data = await response.json();

    // Handle the response
    // Note: The Edge Function currently returns the full text at once (no streaming yet for simplicity)
    if (data.result) {
      onChunk(data.result);
      return data.result;
    }

    return "";

  } catch (error) {
    console.error("Chat Error:", error);
    const msg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    onChunk(msg);
    throw error;
  }
};

// ... (Keep other exports like generateMetaInsight if they are still needed or refactor them too)
// For now, we'll keep generateMetaInsight as is, assuming it might be used separately or needs similar refactoring later.
// But we should comment out or remove the old client-side implementations to avoid confusion/bloat if they are strictly replaced.

export const generateMetaInsight = async (
  history: Message[],
  query: string
): Promise<string> => {
  try {
    const ai = getGeminiClient();

    // Build context from chat history
    const conversationContext = history
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
      .join('\n\n');

    const prompt = `You are analyzing a project conversation. Here's the full chat history:

${conversationContext}

Based on this conversation, answer the following question:
${query}

Provide a comprehensive, well-structured analysis.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    // Handle different SDK response structures
    if (response.text) {
      return response.text || "Unable to generate insight.";
    } else if (response.candidates && response.candidates.length > 0) {
      const part = response.candidates[0].content?.parts?.[0];
      if (part && 'text' in part) {
        return part.text || "Unable to generate insight.";
      }
    }

    return "Unable to generate insight.";
  } catch (error) {
    console.error("Meta-Insight Error:", error);
    throw new Error(`Failed to generate insight: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generateProjectIdeas = async (topic: string): Promise<string> => {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 creative project ideas for: ${topic}. Return strictly a JSON array of objects with keys: title, description, tags.`,
      config: {
        responseMimeType: 'application/json'
      }
    });

    // Handle different SDK response structures
    if (response.text) {
      return response.text || "[]";
    } else if (response.candidates && response.candidates.length > 0) {
      // Fallback to direct access
      const part = response.candidates[0].content?.parts?.[0];
      if (part && 'text' in part) {
        return part.text || "[]";
      }
    }

    return "[]";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return "[]";
  }
};

