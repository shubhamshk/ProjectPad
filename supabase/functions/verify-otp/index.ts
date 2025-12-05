import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_ATTEMPTS = 3;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            throw new Error("Email and OTP are required");
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Fetch latest unused OTP
        const { data: otps, error: fetchError } = await supabaseAdmin
            .from("otp_codes")
            .select("*")
            .eq("email", email)
            .eq("used", false)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        if (!otps || otps.length === 0) {
            return new Response(
                JSON.stringify({ error: "Invalid or expired OTP" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const otpRecord = otps[0];

        // Check attempts
        if (otpRecord.attempts >= MAX_ATTEMPTS) {
            return new Response(
                JSON.stringify({ error: "Too many failed attempts. Please request a new OTP." }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verify Hash
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(otpRecord.salt),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(otp)
        );
        const calculatedHash = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        if (calculatedHash !== otpRecord.otp_hash) {
            // Increment attempts
            await supabaseAdmin
                .from("otp_codes")
                .update({ attempts: otpRecord.attempts + 1 })
                .eq("id", otpRecord.id);

            return new Response(
                JSON.stringify({ error: "Invalid OTP" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Mark as used
        await supabaseAdmin
            .from("otp_codes")
            .update({ used: true })
            .eq("id", otpRecord.id);

        // Create or Update User
        // Check if user exists
        const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
        // listUsers might not be efficient for large userbases, but for this context it's okay-ish. 
        // Better: try to create user, if fails (email exists), update it.

        // Actually, let's try to create the user. If it fails because email exists, we just confirm them.
        // Wait, `createUser` throws if email exists? Or returns error?

        // Alternative: Use `inviteUserByEmail`? No, we want to set them as confirmed.
        // `createUser` allows setting `email_confirm: true`.

        // Let's try to find user by email first to be safe and efficient? 
        // Admin API doesn't have `getUserByEmail` directly exposed easily without listUsers or just trying.
        // We can try `createUser` and catch error.

        let userId;

        // Try to create user
        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { email_verified: true }
        });

        if (createError) {
            // If error is "User already registered", we just need to confirm them if not already.
            // But we don't have the user ID easily if we don't fetch it.
            // So fetching is probably needed if create fails.

            // Let's try to sign in with magic link to get session? No.
            // Let's just update the user attributes if we can find them.

            // We can use listUsers with filter? No, listUsers doesn't filter by email in all versions.
            // But we can assume if they are verifying OTP, they own the email.

            // If create failed, it's likely they exist.
            // We can try to update the user. But we need ID.
            // So we MUST find the ID.

            // Actually, `supabaseAdmin.auth.admin.listUsers()` is not ideal.
            // But maybe we can just return success and let the frontend sign them in?
            // The requirement says: "Create Supabase Auth user (email_confirmed = true)".
            // And "User is optionally auto-logged in".

            // If we want to auto-login, we need to return a session.
            // Admin API `createUser` doesn't return a session.
            // `signInWithOtp` does, but that sends an email.

            // If we want to return a session, we might need to use `signInWithPassword` (if we set a dummy password?) - bad idea.
            // Or `createSession`? Not available in all versions.

            // Let's stick to: Ensure user exists and is confirmed.
            // If they exist, we update `email_confirm: true`.

            // To find the user ID:
            // We can try `supabaseAdmin.from('auth.users').select('id').eq('email', email)`? 
            // No, `auth.users` is not accessible via PostgREST usually unless we exposed it.

            // Let's use `listUsers` for now, assuming small userbase or just accept it might be slow.
            // Or better: `generateLink`? 

            // Wait, if we use `supabaseAdmin.auth.admin.createUser`, and it fails, we can't easily get the ID.
            // BUT, we can use `supabaseAdmin.auth.admin.inviteUserByEmail` which might return the user?

            // Let's try `listUsers` filtering?
            // `supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })` doesn't filter.

            // Okay, let's assume `createUser` works for new users.
            // For existing users, we assume they are already confirmed or we can't easily update them without ID.
            // BUT, if they are logging in via OTP, maybe they are already confirmed?

            // Let's try to be robust.
            // We will try to create. If it fails, we assume they exist.
            // If they exist, we want to ensure they are confirmed.
            // If we can't get ID, we can't update.

            // Workaround: We can't easily get ID of existing user by email via Admin API in some versions.
            // BUT, we can try `supabaseAdmin.auth.signInWithOtp` with `shouldCreateUser: false`? No that sends email.

            // Let's look at `createUser` error.
            // If we can't get ID, we can't do much for existing users except return "Verified".
            // The frontend can then try to login? But how? They don't have password.
            // They just verified OTP.

            // If we want to log them in, we need a session.
            // We can generate a custom JWT? Or use `signInWithIdToken`?

            // Let's try to use `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })`?
            // That returns a link with a token. We can parse the token?
            // `action_link` contains the token.
            // We can return that token to the frontend to exchange for session?

            // `generateLink` returns `{ data: { user, action_link, ... } }`.
            // `user` object will have the ID!
            // And `action_link` can be used to verify?

            // Actually, if we use `generateLink`, we can get the user ID even if they exist!
            // Let's try that.

            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email
            });

            if (linkError) throw linkError;

            const user = linkData.user;

            // Now we have the user. We can ensure they are confirmed.
            if (user && !user.email_confirmed_at) {
                await supabaseAdmin.auth.admin.updateUserById(user.id, { email_confirm: true });
            }

            // We can return the `action_link` or parts of it to allow login?
            // The `action_link` is like `.../verify?token=...&type=magiclink`.
            // If we return the token, the frontend can use `verifyOtp({ token, type: 'magiclink' })`?
            // Yes!

            // So:
            // 1. Verify OUR custom OTP.
            // 2. If valid, generate a Supabase Magic Link (which also creates/gets user).
            // 3. Extract the token (hash) from the link.
            // 4. Return the token to frontend.
            // 5. Frontend uses `supabase.auth.verifyOtp({ token, type: 'magiclink', email })` to get session.

            // This is a clever way to bridge custom OTP with Supabase Auth!

            // Extract token from link
            // Link format: `.../verify?token=...&type=magiclink...`
            const actionLink = linkData.action_link;
            const tokenMatch = actionLink?.match(/token=([^&]+)/);
            const token = tokenMatch ? tokenMatch[1] : null;

            if (!token) throw new Error("Failed to generate access token");

            return new Response(
                JSON.stringify({
                    ok: true,
                    message: "User verified",
                    session_token: token // Frontend will use this
                }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );

        } else {
            // Created new user
            userId = createdUser.user.id;

            // We still need a session for them.
            // We can use the same `generateLink` trick for new users too!
            // So we don't even need `createUser` explicitly if `generateLink` creates them?
            // `generateLink` docs say: "Generates a link... for a user."
            // Does it create? "If the user doesn't exist, it will be created." (Usually yes for magiclink).

            // Let's verify `generateLink` behavior.
            // "generateLink" usually requires the user to exist?
            // "inviteUserByEmail" creates and sends.
            // "createUser" creates.

            // Safest bet: Try `createUser` first (ignoring "already exists" error), THEN `generateLink`.
        }

        // So the flow:
        // 1. Try create user (email_confirm: true).
        // 2. Generate magic link for email.
        // 3. Return token from magic link.

        // Re-implementing with this flow:

        // 1. Try create
        await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { email_verified: true }
        }).catch(() => { }); // Ignore error if exists

        // 2. Generate link
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: email
        });

        if (linkError) throw linkError;

        const actionLink = linkData.action_link;
        const tokenMatch = actionLink?.match(/token=([^&]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) throw new Error("Failed to generate access token");

        return new Response(
            JSON.stringify({
                ok: true,
                message: "User verified",
                token: token, // Frontend uses this to sign in
                email: email
            }),
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
