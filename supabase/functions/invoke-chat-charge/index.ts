import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
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
        if (!authHeader) throw new Error('Missing Authorization header');

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) throw new Error('Unauthorized');

        // 2. Parse Body
        const { messages, modelId, projectId, apiKey: userApiKey } = await req.json();
        if (!messages || !modelId) throw new Error('Missing required fields');

        // 3. Check Credits (but don't deduct yet - only after successful response)
        const COST_PER_MSG = 25;

        let { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('credits, plan')
            .eq('id', user.id)
            .single();

        if (!profile) {
            // Lazy creation if missing (consistent with get-user-credits)
            const { data: newProfile, error: createError } = await supabaseClient
                .from('profiles')
                .insert({
                    id: user.id,
                    plan: 'free',
                    credits: 5000,
                    monthly_project_creations: 0
                })
                .select('credits, plan')
                .single();

            if (createError) throw new Error('Failed to create profile');
            profile = newProfile;
        }

        // Check if user has enough credits (for free plan)
        if (profile.plan === 'free' && profile.credits < COST_PER_MSG) {
            throw new Error('Insufficient credits. Please upgrade to Pro.');
        }

        // 4. Call AI Provider
        let aiResponseText = "";

        if (modelId.startsWith('gemini')) {
            // Gemini Implementation - requires user's API key
            if (!userApiKey) {
                throw new Error("Gemini API Key required. Please add it in Settings → API Keys.");
            }

            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${userApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages.map((m: any) => ({
                        role: m.role === 'user' ? 'user' : 'model',
                        parts: [{ text: m.content }]
                    }))
                })
            });

            if (!resp.ok) {
                const error = await resp.text();
                throw new Error(`Gemini API Error: ${error}`);
            }

            const data = await resp.json();
            aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

        } else if (modelId.startsWith('gpt')) {
            // OpenAI Implementation - requires user's API key
            if (!userApiKey) {
                throw new Error("OpenAI API Key required. Please add it in Settings → API Keys.");
            }

            const resp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages.map((m: any) => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    })),
                    max_tokens: 1000
                })
            });

            if (!resp.ok) {
                const error = await resp.text();
                throw new Error(`OpenAI API Error: ${error}`);
            }

            const data = await resp.json();
            aiResponseText = data.choices?.[0]?.message?.content || "No response from OpenAI";

        } else if (modelId.startsWith('perplexity')) {
            // Perplexity Implementation - requires user's API key
            if (!userApiKey) {
                throw new Error("Perplexity API Key required. Please add it in Settings → API Keys.");
            }

            const resp = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-sonar-small-128k-online',
                    messages: messages.map((m: any) => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                })
            });

            if (!resp.ok) {
                const error = await resp.text();
                throw new Error(`Perplexity API Error: ${error}`);
            }

            const data = await resp.json();
            aiResponseText = data.choices?.[0]?.message?.content || "No response from Perplexity";

        } else {
            // HuggingFace Models (Mistral, Qwen, Llama, DeepSeek) - uses encrypted key from DB via hf-proxy

            // Map model IDs to HuggingFace model names with router provider suffix
            const modelMap: Record<string, string> = {
                'mistral-7b': 'mistralai/Mistral-7B-Instruct-v0.2:featherless-ai',
                'qwen-7b': 'Qwen/Qwen3-8B:nscale',
                'qwen-14b': 'Qwen/Qwen3-14B:nscale',
                'llama-3.1-8b': 'meta-llama/Llama-3.1-8B-Instruct:sambanova',
                'deepseek-r1': 'deepseek-ai/DeepSeek-R1:novita'
            };

            const hfModel = modelMap[modelId] || modelMap['mistral-7b'];

            // Fetch encrypted key from DB
            const { data: hfProfile, error: hfError } = await supabaseClient
                .from('profiles')
                .select('hf_key_enc')
                .eq('id', user.id)
                .single();

            if (hfError || !hfProfile?.hf_key_enc) {
                throw new Error('HuggingFace API key not found. Please add your key in Settings.');
            }

            // Decrypt the key using MASTER_KEY
            const masterKey = Deno.env.get('MASTER_KEY');
            if (!masterKey) {
                throw new Error('Server misconfiguration: MASTER_KEY not set');
            }

            let userHfKey: string;
            try {
                const encryptedData = JSON.parse(hfProfile.hf_key_enc);

                // Decrypt AES-GCM
                const keyBytes = new Uint8Array(masterKey.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
                const cryptoKey = await crypto.subtle.importKey(
                    "raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
                );
                const iv = Uint8Array.from(atob(encryptedData.iv), (c: string) => c.charCodeAt(0));
                const ct = Uint8Array.from(atob(encryptedData.ct), (c: string) => c.charCodeAt(0));
                const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ct);
                userHfKey = new TextDecoder().decode(decrypted);
            } catch (e) {
                throw new Error('Failed to decrypt HuggingFace API key');
            }

            // Format messages for HuggingFace (OpenAI-compatible format)
            const chatMessages = messages.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

            console.log(`Calling HF Model: ${hfModel}`);

            // Use the new OpenAI-compatible HuggingFace router endpoint
            const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userHfKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: hfModel,
                    messages: chatMessages,
                    max_tokens: 1024,
                    temperature: 0.7,
                    top_p: 0.95
                })
            });

            const responseText = await resp.text();

            // Update key validity based on response
            if (resp.status === 401 || resp.status === 403) {
                await supabaseClient
                    .from('profiles')
                    .update({ hf_key_valid: false })
                    .eq('id', user.id);
                throw new Error('Invalid HuggingFace API key. Please update your key in Settings.');
            }

            if (!resp.ok) {
                console.error(`HF API Error (${resp.status}):`, responseText);
                throw new Error(`HuggingFace API Error (${resp.status}): ${responseText}`);
            }

            // Mark key as valid on successful auth
            await supabaseClient
                .from('profiles')
                .update({ hf_key_valid: true })
                .eq('id', user.id);

            try {
                const data = JSON.parse(responseText);

                // Handle OpenAI-compatible response format
                if (data.choices && data.choices[0]?.message?.content) {
                    aiResponseText = data.choices[0].message.content;
                } else if (Array.isArray(data)) {
                    aiResponseText = data[0]?.generated_text;
                } else if (data.generated_text) {
                    aiResponseText = data.generated_text;
                } else if (data.error) {
                    throw new Error(`HuggingFace Error: ${data.error}`);
                } else if (typeof data === 'string') {
                    aiResponseText = data;
                }
            } catch (e) {
                console.warn("HF Response was not JSON:", responseText);
                aiResponseText = responseText;
            }

            if (!aiResponseText) {
                console.error("HF Empty Response:", responseText);
                aiResponseText = "Error: Received empty response from HuggingFace model.";
            }
        }

        // 5. Deduct Credits ONLY after successful response generation
        let creditsRemaining = profile.credits;

        if (profile.plan === 'free') {
            const { data: updatedProfile, error: updateError } = await supabaseClient
                .from('profiles')
                .update({ credits: profile.credits - COST_PER_MSG })
                .eq('id', user.id)
                .select('credits')
                .single();

            if (updateError) {
                console.error('Failed to deduct credits:', updateError);
                // Don't fail the request if credit deduction fails, just log it
                creditsRemaining = profile.credits - COST_PER_MSG;
            } else {
                creditsRemaining = updatedProfile.credits;
            }
        } else {
            // Pro users: don't deduct, but still show current balance
            creditsRemaining = profile.credits;
        }

        // 6. Return Response with updated credits
        return new Response(
            JSON.stringify({
                ok: true,
                result: aiResponseText,
                creditsRemaining: creditsRemaining
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
