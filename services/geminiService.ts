
import { GoogleGenAI } from "@google/genai";
import { Message, AIModelId } from '../types';
import { useStore } from '../store';

// Helper to get Gemini Client with dynamic key
const getGeminiClient = () => {
  const storeKey = useStore.getState().apiKeys.gemini;
  const key = storeKey || process.env.API_KEY;

  if (!key) {
    throw new Error("Gemini API Key missing. Please add it in Settings.");
  }

  return new GoogleGenAI({ apiKey: key });
};

// --- Unified Chat Gateway ---

export const generateProjectChatResponse = async (
  history: Message[],
  prompt: string,
  modelId: AIModelId,
  onChunk: (text: string) => void
): Promise<string> => {
  // Route to appropriate provider
  if (modelId.startsWith('gemini')) {
    return generateGeminiResponse(history, prompt, modelId as 'gemini-2.5-flash' | 'gemini-3-pro-preview', onChunk);
  } else if (modelId.startsWith('gpt')) {
    return generateOpenAIResponse(history, prompt, onChunk);
  } else if (modelId.startsWith('perplexity')) {
    return generatePerplexityResponse(history, prompt, onChunk);
  } else if (['mistral-7b', 'qwen-7b', 'qwen-14b', 'llama-3.1-8b', 'deepseek-r1'].includes(modelId)) {
    return generateHuggingFaceResponse(history, prompt, modelId as 'mistral-7b' | 'qwen-7b' | 'qwen-14b' | 'llama-3.1-8b' | 'deepseek-r1', onChunk);
  }

  throw new Error(`Unsupported model: ${modelId}`);
};

// --- Google Gemini Implementation ---

const generateGeminiResponse = async (
  history: Message[],
  prompt: string,
  modelId: 'gemini-2.5-flash' | 'gemini-3-pro-preview',
  onChunk: (text: string) => void
) => {
  try {
    const ai = getGeminiClient();
    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: "You are an expert project manager and coding assistant named ProjectPad. Be concise, technical, and helpful. Use Markdown for formatting.",
      },
      history: history
        .filter(h => h.role !== 'system')
        .map(h => ({
          role: h.role,
          parts: [{ text: h.content }]
        }))
    });

    const result = await chat.sendMessageStream({ message: prompt });

    let fullText = '';
    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    const msg = `Error connecting to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`;
    onChunk(msg);
    throw error;
  }
};

// --- OpenAI Implementation (Client-side Fetch) ---

const generateOpenAIResponse = async (
  history: Message[],
  prompt: string,
  onChunk: (text: string) => void
) => {
  const apiKey = useStore.getState().apiKeys.openai;
  if (!apiKey) {
    const msg = "⚠️ OpenAI API Key missing. Please add it in Settings.";
    onChunk(msg);
    return msg;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: "You are ProjectPad, an expert technical assistant." },
          ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
          { role: 'user', content: prompt }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message || response.statusText;

      if (response.status === 429) {
        const msg = `🚫 **OpenAI Rate Limit Exceeded**\n\nYou've hit OpenAI's rate limit. This usually means:\n- Free tier quota exhausted\n- No credits/payment method on account\n- Too many requests\n\n**Solutions:**\n1. Wait a few minutes and try again\n2. Add credits to your OpenAI account at platform.openai.com/account/billing\n3. Switch to Gemini model (select from dropdown) - it's free!\n\n*Tip: Use Gemini 2.5 Flash for faster & free responses*`;
        onChunk(msg);
        throw new Error(msg);
      } else if (response.status === 401) {
        const msg = `🔑 **Invalid OpenAI API Key**\n\nYour API key appears to be invalid or revoked.\n\n**To fix:**\n1. Go to platform.openai.com/api-keys\n2. Create a new API key\n3. Update it in Settings\n\nOr switch to Gemini (free) from the model dropdown!`;
        onChunk(msg);
        throw new Error(msg);
      } else if (response.status === 402) {
        const msg = `💳 **OpenAI Payment Required**\n\nYour OpenAI account needs credits.\n\n**To fix:**\n1. Visit platform.openai.com/account/billing\n2. Add a payment method and credits\n\nOr use Gemini models (free)!`;
        onChunk(msg);
        throw new Error(msg);
      }

      throw new Error(`OpenAI Error (${response.status}): ${errorMessage}`);
    }
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.trim() === 'data: [DONE]') continue;
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(fullText);
            }
          } catch (e) {
            console.error('Error parsing stream', e);
          }
        }
      }
    }
    return fullText;

  } catch (error) {
    console.error("OpenAI Error:", error);
    const msg = `Error connecting to OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`;
    onChunk(msg);
    return msg;
  }
};

// --- Perplexity Implementation ---

const generatePerplexityResponse = async (
  history: Message[],
  prompt: string,
  onChunk: (text: string) => void
) => {
  const apiKey = useStore.getState().apiKeys.perplexity;
  if (!apiKey) {
    const msg = "⚠️ Perplexity API Key missing. Please add it in Settings.";
    onChunk(msg);
    return msg;
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-deep-research',
        messages: [
          { role: 'system', content: "Be precise and helpful." },
          ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
          { role: 'user', content: prompt }
        ],
        stream: true
      })
    });

    if (!response.ok) throw new Error(`Perplexity Error: ${response.statusText}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(fullText);
            }
          } catch (e) {
            // Perplexity sometimes sends non-JSON pings
          }
        }
      }
    }
    return fullText;

  } catch (error) {
    console.error("Perplexity Error:", error);
    const msg = `Error connecting to Perplexity: ${error instanceof Error ? error.message : 'Unknown error'}`;
    onChunk(msg);
    return msg;
  }
};

// --- HuggingFace Free Models Implementation ---

const HF_MODELS: Record<string, { endpoint: string; format: 'instruct' | 'chat' }> = {
  'mistral-7b': { endpoint: 'mistralai/Mistral-7B-Instruct-v0.2', format: 'instruct' },
  'qwen-7b': { endpoint: 'Qwen/Qwen2.5-7B-Instruct', format: 'chat' },
  'qwen-14b': { endpoint: 'Qwen/Qwen2.5-14B-Instruct', format: 'chat' },
  'llama-3.1-8b': { endpoint: 'meta-llama/Meta-Llama-3.1-8B-Instruct', format: 'chat' },
  'deepseek-r1': { endpoint: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', format: 'chat' }
};

const generateHuggingFaceResponse = async (
  history: Message[],
  prompt: string,
  modelId: 'mistral-7b' | 'qwen-7b' | 'qwen-14b' | 'llama-3.1-8b' | 'deepseek-r1',
  onChunk: (text: string) => void
) => {
  const apiKey = useStore.getState().apiKeys.huggingface || import.meta.env.VITE_HF_TOKEN;
  if (!apiKey) {
    const msg = "🤗 HuggingFace API Key missing. Please add it in Settings to use free models.";
    onChunk(msg);
    return msg;
  }

  const modelConfig = HF_MODELS[modelId];
  if (!modelConfig) {
    const msg = `Model ${modelId} not configured.`;
    onChunk(msg);
    return msg;
  }

  try {
    const systemPrompt = "You are ProjectPad, an expert technical assistant.";

    // Format input based on model type
    let input: string;
    if (modelConfig.format === 'instruct') {
      // Mistral Instruct format
      const context = history.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      input = `<s>[INST] ${systemPrompt}\n\n${context}\n\nUser: ${prompt} [/INST]`;
    } else {
      // Chat format (Qwen, Llama, DeepSeek)
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-5).map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: prompt }
      ];
      input = messages.map(m => `<|${m.role}|>\n${m.content}`).join('\n') + '\n<|assistant|>\n';
    }

    // Use CORS proxy for browser requests
    const apiUrl = `https://api-inference.huggingface.co/models/${modelConfig.endpoint}`;
    const corsProxy = 'https://corsproxy.io/?';

    const response = await fetch(
      corsProxy + encodeURIComponent(apiUrl),
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: input,
          parameters: {
            max_new_tokens: 512,
            return_full_text: false,
            temperature: 0.7,
            top_p: 0.9,
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || response.statusText;

      if (response.status === 503) {
        const msg = `⏳ Model is loading... Please wait 20-30 seconds and try again.\n\nHuggingFace free models need to "wake up" on first use.`;
        onChunk(msg);
        throw new Error(msg);
      } else if (response.status === 401) {
        const msg = `🔑 Invalid HuggingFace API Key. Get one free at huggingface.co/settings/tokens`;
        onChunk(msg);
        throw new Error(msg);
      }

      throw new Error(`HuggingFace Error (${response.status}): ${errorMessage}`);
    }

    const result = await response.json();
    const answer = Array.isArray(result) ? result[0]?.generated_text || '' : result.generated_text || '';

    // Clean up the output
    const cleanAnswer = answer.trim();
    onChunk(cleanAnswer);
    return cleanAnswer;

  } catch (error) {
    console.error("HuggingFace Error:", error);
    const msg = `Error with ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    onChunk(msg);
    return msg;
  }
};

// --- Meta Tools ---

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
    return response.text || "[]";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return "[]";
  }
};

export const generateMetaInsight = async (
  history: Message[],
  query: string
): Promise<string> => {
  try {
    const ai = getGeminiClient();
    // The Meta-Brain always uses Gemini 3 Pro for superior reasoning over the multi-model chat history
    const model = 'gemini-3-pro-preview';

    // Construct a context-heavy prompt
    const context = history
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const response = await ai.models.generateContent({
      model,
      contents: `
        You are the "Meta-Chatbot" for ProjectPad. Your job is to analyze the entire conversation history of a project (which may contain responses from Gemini, GPT, and Perplexity) and provide high-level insights.
        
        Here is the Project Conversation History:
        ---
        ${context}
        ---
        
        User Query: ${query}
        
        Provide a comprehensive, intelligent answer.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    return response.text || "I couldn't analyze the project at this time.";
  } catch (error) {
    console.error("Meta Insight Error:", error);
    return `Error: ${error instanceof Error ? error.message : 'Failed to analyze project.'}`;
  }
};
