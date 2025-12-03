import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const HF_MODELS: Record<string, { endpoint: string; format: 'instruct' | 'chat' }> = {
    'mistral-7b': { endpoint: 'mistralai/Mistral-7B-Instruct-v0.2', format: 'instruct' },
    'qwen-7b': { endpoint: 'Qwen/Qwen2.5-7B-Instruct', format: 'chat' },
    'qwen-14b': { endpoint: 'Qwen/Qwen2.5-14B-Instruct', format: 'chat' },
    'llama-3.1-8b': { endpoint: 'meta-llama/Meta-Llama-3.1-8B-Instruct', format: 'chat' },
    'deepseek-r1': { endpoint: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', format: 'chat' }
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { modelId, input } = await req.json();

        if (!modelId || !input) {
            throw new Error("Missing modelId or input");
        }

        const modelConfig = HF_MODELS[modelId];
        if (!modelConfig) {
            throw new Error(`Unknown model: ${modelId}`);
        }

        // Get HF token from environment (set in Supabase Dashboard)
        const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
        if (!hfToken) {
            throw new Error("HuggingFace API token not configured");
        }

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${modelConfig.endpoint}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${hfToken}`,
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
            const errorText = await response.text();
            return new Response(JSON.stringify({
                error: `HF API Error (${response.status}): ${errorText}`
            }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const result = await response.json();

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
