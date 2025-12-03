import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from "../_shared/supabaseClient.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generateEmbedding } from "../_shared/embeddings.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = getSupabaseClient(req);

        // 1. Get User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");

        // 2. Parse Body
        const { projectId, messages } = await req.json();
        if (!projectId || !messages || !Array.isArray(messages)) throw new Error("Missing projectId or messages array");

        const lastMessage = messages[messages.length - 1];
        const query = lastMessage.content;

        // 3. RAG: Search for context
        const embedding = await generateEmbedding(query);
        const { data: chunks, error: rpcError } = await supabase
            .rpc('match_project_chunks', {
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 5,
                filter_project_id: projectId
            });

        if (rpcError) throw rpcError;

        const context = chunks?.map((c: any) => c.content).join('\n\n') || "";

        // 4. Call LLM (Mistral via HF)
        const systemPrompt = `You are ProjectPad, an expert AI assistant. Use the following context to answer the user's question. If the answer isn't in the context, say so, but try to be helpful.
    
    Context:
    ${context}
    `;

        // Construct prompt for Mistral (Instruction format)
        // [INST] System + User [/INST]
        // We'll simplify and just append context to the last user message for now, or use a proper chat template if HF supports it.
        // HF Inference API for Mistral-7B-Instruct usually expects a specific format or just a raw string.
        // Let's use the conversational task or text-generation.

        const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
        if (!hfToken) throw new Error("HF Token missing");

        const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${hfToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: `<s>[INST] ${systemPrompt} \n\n User: ${query} [/INST]`,
                    parameters: {
                        max_new_tokens: 512,
                        return_full_text: false,
                    }
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HF API Error: ${err}`);
        }

        const result = await response.json();
        // Mistral result is usually [{ generated_text: "..." }]
        const answer = Array.isArray(result) ? result[0].generated_text : result.generated_text;

        return new Response(JSON.stringify({ answer, contextUsed: chunks }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
