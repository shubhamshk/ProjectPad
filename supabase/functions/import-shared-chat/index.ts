import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { corsHeaders } from "../_shared/cors.ts"
import { parseSharedChat } from "../_shared/chatParsers.ts"

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

        // 2. Fetch User Profile & Quota Check
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('plan, import_count')
            .eq('id', user.id)
            .single()

        if (profileError) throw profileError;

        // Hard limit: 3 imports for free users
        if (profile.plan === 'free' && (profile.import_count || 0) >= 3) {
            return new Response(
                JSON.stringify({
                    error: 'QuotaExceeded',
                    message: 'Free plan limit reached (3 imports). Please upgrade to Pro.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 3. Parse Request
        const { url, provider } = await req.json()
        if (!url) throw new Error('URL is required');

        // 4. Parse Chat Content
        const parsedData = await parseSharedChat(url, provider);

        if (!parsedData.messages || parsedData.messages.length === 0) {
            return new Response(
                JSON.stringify({
                    error: 'ParseError',
                    message: 'Could not parse messages from this link. The provider format may have changed or the link is private.'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 }
            )
        }

        // 5. Return Preview Data (Do not save to DB yet - waiting for user confirmation)
        return new Response(
            JSON.stringify(parsedData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
