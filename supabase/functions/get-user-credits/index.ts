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

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) throw new Error('Unauthorized');

        let { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('credits, plan')
            .eq('id', user.id)
            .single();

        if (!profile) {
            // Lazy creation
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

            if (createError || !newProfile) throw createError || new Error("Failed to create profile");
            profile = newProfile;
        } else if (error) {
            throw error;
        }

        // Lazy migration: Update existing users with old default (300) to new default (5000)
        if (profile && profile.plan === 'free' && profile.credits <= 300) {
            const { data: updatedProfile, error: updateError } = await supabaseClient
                .from('profiles')
                .update({ credits: 5000 })
                .eq('id', user.id)
                .select('credits, plan')
                .single();

            if (!updateError && updatedProfile) {
                profile = updatedProfile;
            }
        }

        return new Response(
            JSON.stringify({
                credits_remaining: profile.credits,
                subscription_tier: profile.plan
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
