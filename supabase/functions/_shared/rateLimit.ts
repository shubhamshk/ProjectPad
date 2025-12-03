import { getServiceSupabaseClient } from "./supabaseClient.ts";

interface RateLimitConfig {
    maxRequests: number;
    windowMs: number; // Time window in milliseconds
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
    free: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour
    embed: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hour
    search: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour
    chat: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hour
};

export async function checkRateLimit(
    userId: string,
    action: string,
    config?: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
    const limit = config || DEFAULT_LIMITS[action] || DEFAULT_LIMITS.free;
    const supabase = getServiceSupabaseClient();

    // Simple implementation using a rate_limits table (to be created)
    // For now, we'll use in-memory tracking (not production-ready but simple)
    // In production, use Redis or a proper rate_limits table with timestamps

    // This is a placeholder - implement with actual storage
    // For MVP, you can skip rate limiting or use Supabase Edge Functions built-in rate limiting

    return { allowed: true, remaining: limit.maxRequests };
}

// SQL Migration for rate_limits table (optional, for future enhancement)
/*
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  action text not null,
  request_count int default 1,
  window_start timestamptz default now(),
  unique(user_id, action, window_start)
);
*/
