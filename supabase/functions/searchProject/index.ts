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
        const { projectId, query, limit = 5, threshold = 0.5 } = await req.json();
        if (!projectId || !query) throw new Error("Missing projectId or query");

        // 3. Generate Query Embedding
        const embedding = await generateEmbedding(query);

        // 4. Call RPC
        const { data: chunks, error: rpcError } = await supabase
            .rpc('match_project_chunks', {
                query_embedding: embedding,
                match_threshold: threshold,
                match_count: limit,
                filter_project_id: projectId
            });

        if (rpcError) throw rpcError;

        return new Response(JSON.stringify({ chunks }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
