import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-GCM decryption helper
async function decryptKey(encryptedData: { iv: string; ct: string }, masterKeyHex: string): Promise<string> {
    // Convert hex master key to bytes
    const keyBytes = new Uint8Array(masterKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    // Decode base64 IV and ciphertext
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(encryptedData.ct), c => c.charCodeAt(0));

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ct
    );

    return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Auth Check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            throw new Error('Unauthorized');
        }

        // 2. Parse Body
        const { model, inputs, parameters, options } = await req.json();
        if (!model) {
            throw new Error('Missing model parameter');
        }

        // 3. Fetch encrypted key from database
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('hf_key_enc')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.hf_key_enc) {
            throw new Error('HuggingFace API key not found. Please add your key in Settings.');
        }

        // 4. Get Master Key and decrypt
        const masterKey = Deno.env.get('MASTER_KEY');
        if (!masterKey) {
            throw new Error('Server misconfiguration: MASTER_KEY not set');
        }

        let userHfKey: string;
        try {
            const encryptedData = JSON.parse(profile.hf_key_enc);
            userHfKey = await decryptKey(encryptedData, masterKey);
        } catch (e) {
            throw new Error('Failed to decrypt API key');
        }

        // 5. Proxy request to HuggingFace
        const hfUrl = `https://router.huggingface.co/hf-inference/models/${model}`;

        console.log(`Proxying request to HF model: ${model}`);

        const hfResponse = await fetch(hfUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userHfKey}`,
                'Content-Type': 'application/json',
                'x-wait-for-model': 'true',
                'x-use-cache': 'false'
            },
            body: JSON.stringify({
                inputs,
                parameters,
                options
            }),
        });

        const responseText = await hfResponse.text();

        // 6. Update key validity based on response
        if (hfResponse.status === 401 || hfResponse.status === 403) {
            // Invalid API key
            await supabaseClient
                .from('profiles')
                .update({ hf_key_valid: false })
                .eq('id', user.id);

            return new Response(
                JSON.stringify({
                    ok: false,
                    status: hfResponse.status,
                    error: 'Invalid HuggingFace API key. Please update your key in Settings.',
                    body: responseText
                }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Mark key as valid on successful auth
        if (hfResponse.ok) {
            await supabaseClient
                .from('profiles')
                .update({ hf_key_valid: true })
                .eq('id', user.id);
        }

        // 7. Parse and return response
        try {
            const jsonResult = JSON.parse(responseText);
            return new Response(
                JSON.stringify({
                    ok: hfResponse.ok,
                    status: hfResponse.status,
                    result: jsonResult
                }),
                {
                    status: hfResponse.ok ? 200 : 502,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        } catch (e) {
            // Return as text if not JSON
            return new Response(
                JSON.stringify({
                    ok: hfResponse.ok,
                    status: hfResponse.status,
                    result: responseText
                }),
                {
                    status: hfResponse.ok ? 200 : 502,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

    } catch (error) {
        console.error('hf-proxy error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
