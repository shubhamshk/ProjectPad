import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized');

        const { action, chatId, parameters } = await req.json();

        // Verify ownership
        const { data: chat, error: chatError } = await supabaseClient
            .from('imported_chats')
            .select('id')
            .eq('id', chatId)
            .eq('user_id', user.id)
            .single();

        if (chatError || !chat) throw new Error('Chat not found or access denied');

        // Retrieve messages (context)
        const { data: messages } = await supabaseClient
            .from('imported_messages')
            .select('role, content')
            .eq('imported_chat_id', chatId)
            .order('original_index', { ascending: true })
            .limit(50); // Context window limit

        // MOCK AI PROCESSING
        // In production, call OpenAI/Gemini API here using the context.
        let result = '';

        if (action === 'summary') {
            result = "This is a generated summary of your imported chat. It focuses on the key technical decisions discussed.";
        } else if (action === 'tasks') {
            result = "- [ ] Review the code snippets\n- [ ] Refactor the shared component\n- [ ] Update documentation";
        } else {
            result = "Action processed successfully.";
        }

        return new Response(
            JSON.stringify({ result, action }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
