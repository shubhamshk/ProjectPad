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
        const { projectId, content, metadata } = await req.json();
        if (!projectId || !content) throw new Error("Missing projectId or content");

        // 3. Verify Project Ownership (Optional, RLS handles it but good for early exit)
        // RLS on insert will fail if project doesn't belong to user? 
        // Actually RLS on `chat_chunks` checks `exists (select 1 from projects ...)`
        // So we can just try to insert.

        // 4. Generate Embedding
        const embedding = await generateEmbedding(content);

        // 5. Insert
        const { error: insertError } = await supabase
            .from('chat_chunks')
            .insert({
                project_id: projectId,
                content,
                embedding,
                metadata: metadata || {}
            });

        if (insertError) throw insertError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
