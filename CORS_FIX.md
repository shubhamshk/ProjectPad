# 🚀 HuggingFace Free Models - Quick Fix for CORS Error

## The Problem
HuggingFace API doesn't allow direct browser calls (CORS restriction).

## Quick Solution (2 Options)

### ✅ Option 1: Use Supabase Edge Function (Recommended)

1. **Set up your HF token in Supabase** (if you have Supabase configured):
   ```bash
   supabase secrets set HUGGING_FACE_ACCESS_TOKEN=your_hf_token_here
   ```

2. **Deploy the proxy function**:
   ```bash
   supabase functions deploy huggingface-proxy
   ```

3. **Add to your `.env.local`**:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Restart your dev server**: `npm run dev`

### ⚡ Option 2: Use HF Token Locally (Quick Dev Setup)

For now, just add your HF token directly to `.env.local`:

```bash
VITE_HF_TOKEN=hf_your_token_here
```

Then I'll update the code to work without Supabase for local development.

---

## Why This Happens

Browsers block direct API calls to HuggingFace due to CORS policy. We need either:
1. A backend proxy (Supabase Edge Function) - **Production ready**
2. Local development workaround - **For testing only**

## Next Steps

Which option do you prefer?
- **Option 1** (Supabase) - More setup, but production-ready
- **Option 2** (Local token) - Quick test, needs proxy later

Let me know and I'll help you set it up!
