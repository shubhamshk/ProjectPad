# Supabase Backend Deployment Checklist

## Pre-Deployment

- [ ] **Supabase Project Created**
  - Sign up at [supabase.com](https://supabase.com)
  - Create new project
  - Note project ref & anon key

- [ ] **Install Supabase CLI**
  ```bash
  npm install -g supabase
  ```

- [ ] **Generate Encryption Key**
  ```bash
  openssl rand -hex 32
  ```
  Save this securely - you'll need it for secrets

- [ ] **Get HuggingFace API Token**
  - Visit [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
  - Create new token with read permissions
  - Copy token (starts with `hf_`)

## Local Setup & Testing

- [ ] **Link Local Project**
  ```bash
  cd c:/Users/shubh/OneDrive/Desktop/projectpadAi
  supabase link --project-ref <your-project-ref>
  ```

- [ ] **Start Local Supabase**
  ```bash
  supabase start
  ```
  This starts local DB, Studio, and Edge Functions runtime

- [ ] **Run Migrations**
  ```bash
  supabase db push
  ```
  Verify in Studio: http://localhost:54323

- [ ] **Verify pgvector Extension**
  - Open Supabase Studio → Database → Extensions
  - Confirm `vector` is enabled
  - Or run: `SELECT * FROM pg_extension WHERE extname = 'vector';`

- [ ] **Create Test Project**
  Via Studio or SQL:
  ```sql
  INSERT INTO projects (user_id, name, description)
  VALUES ('<your-test-user-id>', 'Test Project', 'Testing embeddings');
  ```

- [ ] **Test Edge Functions Locally**
  
  Terminal 1:
  ```bash
  supabase functions serve
  ```
  
  Terminal 2 (set your tokens first):
  ```bash
  export HUGGING_FACE_ACCESS_TOKEN=hf_xxxxx
  export ENCRYPTION_KEY=<your-32-byte-hex>
  export SUPABASE_URL=http://localhost:54321
  export SUPABASE_ANON_KEY=<local-anon-key>
  ```

  Test embed:
  ```bash
  curl -X POST http://localhost:54321/functions/v1/embed \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "projectId": "<test-project-uuid>",
      "content": "React is a JavaScript library for building user interfaces."
    }'
  ```

  Expected: `{"success":true}`

  Test search:
  ```bash
  curl -X POST http://localhost:54321/functions/v1/searchProject \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "projectId": "<test-project-uuid>",
      "query": "JavaScript library",
      "limit": 5
    }'
  ```

  Expected: `{"chunks":[...]}`

  Test chat:
  ```bash
  curl -X POST http://localhost:54321/functions/v1/metaChatProject \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "projectId": "<test-project-uuid>",
      "messages": [{"role": "user", "content": "What is React?"}]
    }'
  ```

  Expected: `{"answer":"...","contextUsed":[...]}`

## Production Deployment

- [ ] **Set Secrets in Supabase Dashboard**
  
  Dashboard → Settings → Edge Functions → Add Secret:
  
  - `HUGGING_FACE_ACCESS_TOKEN` = `hf_xxxxx`
  - `ENCRYPTION_KEY` = `<your-32-byte-hex>`

- [ ] **Deploy Migrations to Production**
  ```bash
  supabase db push --linked
  ```

- [ ] **Deploy Edge Functions**
  ```bash
  supabase functions deploy embed
  supabase functions deploy searchProject
  supabase functions deploy metaChatProject
  supabase functions deploy manageApiKeys
  ```

- [ ] **Verify Deployments**
  Dashboard → Edge Functions → Check all 4 functions are listed

- [ ] **Test Production Endpoints**
  
  Get your production URL: `https://<project-ref>.supabase.co`
  
  ```bash
  curl -X POST https://<project-ref>.supabase.co/functions/v1/embed \
    -H "Authorization: Bearer <anon-key>" \
    -H "Content-Type: application/json" \
    -d '{"projectId":"<uuid>","content":"test"}'
  ```

## Frontend Integration

- [ ] **Update Frontend .env**
  
  Create `.env.local` in project root:
  ```bash
  VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<your-anon-key>
  ```

- [ ] **Install Supabase Client**
  ```bash
  npm install @supabase/supabase-js
  ```

- [ ] **Create Supabase Client Wrapper**
  
  `services/supabaseClient.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  ```

- [ ] **Add Auth State Management**
  
  Update `store.ts` to include Supabase auth:
  ```typescript
  import { supabase } from './services/supabaseClient';

  // Add auth listener
  supabase.auth.onAuthStateChange((event, session) => {
    // Update store with session
  });
  ```

- [ ] **Call Edge Functions from Frontend**
  
  Example:
  ```typescript
  const embedText = async (projectId: string, content: string) => {
    const { data, error } = await supabase.functions.invoke('embed', {
      body: { projectId, content }
    });
    return data;
  };
  ```

## Post-Deployment Verification

- [ ] **Check Function Logs**
  Dashboard → Edge Functions → Select function → Logs
  Look for errors or warnings

- [ ] **Monitor Database Usage**
  Dashboard → Database → Usage
  Verify tables are being populated

- [ ] **Test End-to-End Flow**
  1. Create project
  2. Embed some text
  3. Search for that text
  4. Chat about the project

- [ ] **Set Up Monitoring**
  - Enable Supabase email alerts
  - Monitor error rates in Dashboard
  - Set up Sentry/LogRocket for frontend errors (optional)

## Security Hardening

- [ ] **Review RLS Policies**
  Dashboard → Database → Tables → Verify policies on:
  - `projects`
  - `chat_chunks`
  - `api_keys`

- [ ] **Enable MFA for Supabase Account**
  Dashboard → Account Settings → Enable 2FA

- [ ] **Rotate Secrets Regularly**
  Plan: Every 90 days
  - Generate new encryption key
  - Re-encrypt all API keys
  - Update secret in Dashboard

- [ ] **Configure CORS (if needed)**
  Dashboard → Settings → API → CORS
  Add your frontend domains

## Optimization (Optional)

- [ ] **Add Database Indexes**
  ```sql
  CREATE INDEX idx_chat_chunks_project_id ON chat_chunks(project_id);
  CREATE INDEX idx_chat_chunks_created_at ON chat_chunks(created_at DESC);
  ```

- [ ] **Tune pgvector Index**
  ```sql
  -- Adjust 'lists' based on data size
  -- Rule of thumb: lists = sqrt(total_rows)
  DROP INDEX IF EXISTS chat_chunks_embedding_idx;
  CREATE INDEX chat_chunks_embedding_idx 
  ON chat_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200); -- Increase as data grows
  ```

- [ ] **Enable Connection Pooling**
  Dashboard → Settings → Database → Enable Pooler
  Use pooler connection string for high-traffic apps

- [ ] **Set Up Database Backups**
  Dashboard → Database → Backups
  Verify daily backups are enabled (included in Pro plan)

## Troubleshooting

### Function deployment fails
- Check: Supabase CLI is latest version (`npm update -g supabase`)
- Verify: No syntax errors in function files
- Try: Deploy one function at a time

### "vector extension not found" error
- Enable in Dashboard → Database → Extensions
- Or run: `CREATE EXTENSION IF NOT EXISTS vector;`
- Restart functions: `supabase functions deploy <name>`

### Rate limit errors from HuggingFace
- Check: Token is valid (test at huggingface.co)
- Upgrade: HF Pro account for higher limits
- Alternative: Self-host embedding model

### Slow vector searches
- Check: Index exists (`\di` in psql)
- Tune: Increase/decrease `lists` parameter
- Monitor: Query time in Database → Performance

## Done! 🎉

Your Supabase backend is now live and ready for production use.

**Next Steps:**
- Integrate with your React frontend
- Add user authentication
- Implement billing (if needed)
- Scale as you grow!

**Support:**
- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- This repo's README: `supabase/README.md`
