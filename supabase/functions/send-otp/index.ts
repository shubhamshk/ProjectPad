import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const COOLDOWN_SECONDS = 60;
const EXPIRY_MINUTES = 10;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email } = await req.json();

        if (!email) {
            throw new Error("Email is required");
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Check for recent OTPs (cooldown)
        const { data: recentOtps, error: fetchError } = await supabaseAdmin
            .from("otp_codes")
            .select("created_at")
            .eq("email", email)
            .gt("created_at", new Date(Date.now() - COOLDOWN_SECONDS * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        if (recentOtps && recentOtps.length > 0) {
            return new Response(
                JSON.stringify({ error: "Please wait before requesting another OTP" }),
                {
                    status: 429,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = crypto.randomUUID();

        // Hash OTP
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(salt),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(otp)
        );
        const otpHash = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        // Store in DB
        const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000).toISOString();

        const { error: insertError } = await supabaseAdmin
            .from("otp_codes")
            .insert({
                email,
                otp_hash: otpHash,
                salt,
                expires_at: expiresAt,
            });

        if (insertError) throw insertError;

        // Send Email via Mailtrap
        const emailSent = await sendEmailViaMailtrap(email, otp);
        if (!emailSent) {
            throw new Error("Failed to send OTP email via Mailtrap");
        }

        return new Response(
            JSON.stringify({ ok: true, message: "OTP sent successfully" }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});

async function sendEmailViaMailtrap(to: string, otp: string) {
    const MAILTRAP_API_TOKEN = Deno.env.get("MAILTRAP_API_TOKEN");
    if (!MAILTRAP_API_TOKEN) {
        console.error("MAILTRAP_API_TOKEN missing");
        return false;
    }

    const payload = {
        from: { email: "hello@demomailtrap.co", name: "Mailtrap Test" },
        to: [{ email: to }],
        subject: "Your verification code",
        text: `Your OTP is ${otp}`,
        category: "Integration Test",
    };

    try {
        const resp = await fetch("https://send.api.mailtrap.io/api/send", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${MAILTRAP_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            console.error("Mailtrap error:", resp.status, await resp.text());
            return false;
        }

        return true;
    } catch (e) {
        console.error("Mailtrap exception:", e);
        return false;
    }
}
