import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { model, inputs, parameters, options } = await req.json();

        if (!model) {
            return new Response(
                JSON.stringify({ error: 'Model endpoint is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get HuggingFace API key from request header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Authorization header required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log('Received auth header:', authHeader.substring(0, 20) + '...');
        console.log('Model:', model);

        // Forward request to HuggingFace with the same Authorization header
        const hfUrl = `https://api-inference.huggingface.co/models/${model}`;
        const hfResponse = await fetch(hfUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs,
                parameters,
                options
            }),
        });

        console.log('HF Response status:', hfResponse.status);

        const data = await hfResponse.json();
        console.log('HF Response data:', JSON.stringify(data).substring(0, 200));

        return new Response(
            JSON.stringify(data),
            {
                status: hfResponse.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
