import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient } from "../_shared/supabaseClient.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { encrypt, decrypt } from "../_shared/encryption.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = getSupabaseClient(req);

        // Get User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");

        const { method } = req;
        const body = method !== 'GET' ? await req.json() : null;

        // GET: Retrieve API keys (return providers only, not the actual keys)
        if (method === 'GET') {
            const { data: keys, error } = await supabase
                .from('api_keys')
                .select('id, provider, created_at')
                .eq('user_id', user.id);

            if (error) throw error;

            return new Response(JSON.stringify({ keys }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // POST: Add or update API key
        if (method === 'POST') {
            const { provider, apiKey } = body;
            if (!provider || !apiKey) throw new Error("Missing provider or apiKey");

            // Encrypt the key
            const { encrypted, iv } = await encrypt(apiKey);

            // Upsert
            const { error } = await supabase
                .from('api_keys')
                .upsert({
                    user_id: user.id,
                    provider,
                    encrypted_key: encrypted,
                    iv,
                }, {
                    onConflict: 'user_id,provider'
                });

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // DELETE: Remove API key
        if (method === 'DELETE') {
            const { provider } = body;
            if (!provider) throw new Error("Missing provider");

            const { error } = await supabase
                .from('api_keys')
                .delete()
                .eq('user_id', user.id)
                .eq('provider', provider);

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error("Method not allowed");

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
