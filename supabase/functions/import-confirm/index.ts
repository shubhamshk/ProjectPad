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

        // 1. Auth Check
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { messages, title, provider, source_url, metadata } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            throw new Error('Invalid payload: messages array required')
        }

        // 2. Quota Check & Increment (Atomic-ish)
        // Supabase JS doesn't support complex transactions easily without RPC.
        // We will do a check then update. Race condition is possible but acceptable for this MVP.
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('plan, import_count')
            .eq('id', user.id)
            .single()

        if (profileError) throw profileError;

        if (profile.plan === 'free' && (profile.import_count || 0) >= 3) {
            return new Response(
                JSON.stringify({ error: 'QuotaExceeded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 3. Insert Chat
        const { data: chatData, error: chatError } = await supabaseClient
            .from('imported_chats')
            .insert({
                user_id: user.id,
                provider: provider || 'other',
                source_url: source_url || '',
                title: title || 'Imported Chat',
                summary_short: 'Processing...',
                metadata: metadata || {}
            })
            .select()
            .single();

        if (chatError) throw chatError;

        // 4. Insert Messages
        const messageRows = messages.map((m: any, idx: number) => ({
            imported_chat_id: chatData.id,
            role: m.role,
            content: m.content,
            original_index: idx
        }));

        const { error: msgError } = await supabaseClient
            .from('imported_messages')
            .insert(messageRows);

        if (msgError) {
            // Rollback (manual)
            await supabaseClient.from('imported_chats').delete().eq('id', chatData.id);
            throw msgError;
        }

        // 5. Update Quota
        if (profile.plan === 'free') {
            await supabaseClient
                .from('profiles')
                .update({ import_count: (profile.import_count || 0) + 1 })
                .eq('id', user.id);
        }

        // 6. Trigger MetaBrain (Async placeholder)
        // Ideally we would send this to a queue. 
        // For now, we just return success and let the client know.

        return new Response(
            JSON.stringify({ success: true, chatId: chatData.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
