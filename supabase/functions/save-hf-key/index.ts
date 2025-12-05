import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-GCM encryption helper
async function encryptKey(plaintext: string, masterKeyHex: string): Promise<{ iv: string; ct: string }> {
    const encoder = new TextEncoder();

    // Convert hex master key to bytes
    const keyBytes = new Uint8Array(masterKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    // Import key for AES-GCM
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        encoder.encode(plaintext)
    );

    // Convert to base64 for storage
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const ctBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

    return { iv: ivBase64, ct: ctBase64 };
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
        const { key } = await req.json();
        if (!key || typeof key !== 'string') {
            throw new Error('Missing or invalid key');
        }

        // 3. Get Master Key from environment and validate
        const masterKey = Deno.env.get('MASTER_KEY');
        if (!masterKey) {
            throw new Error('Server misconfiguration: MASTER_KEY not set. Run: supabase secrets set MASTER_KEY=$(openssl rand -hex 32)');
        }

        // Validate key length (must be 64 hex characters = 32 bytes for AES-256)
        if (!/^[a-fA-F0-9]{64}$/.test(masterKey)) {
            console.error(`MASTER_KEY invalid: length=${masterKey.length}, expected 64 hex chars`);
            throw new Error(`Server misconfiguration: MASTER_KEY must be exactly 64 hex characters (32 bytes). Current length: ${masterKey.length}`);
        }

        // 4. Encrypt the HuggingFace key
        const encrypted = await encryptKey(key, masterKey);
        const encryptedJson = JSON.stringify(encrypted);

        // 5. Store encrypted key in database
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                hf_key_enc: encryptedJson,
                hf_key_valid: false // Reset validation on new key
            })
            .eq('id', user.id);

        if (updateError) {
            throw new Error(`Failed to save key: ${updateError.message}`);
        }

        return new Response(
            JSON.stringify({ ok: true, message: 'HuggingFace key saved securely' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('save-hf-key error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
