# ProjectPad AI - Supabase Backend

## Architecture Overview

This backend provides production-ready vector search and RAG capabilities for ProjectPad AI using Supabase Edge Functions and pgvector.

### Design Principles

- **Serverless-first**: All logic runs in Supabase Edge Functions (Deno runtime)
- **Minimal dependencies**: Uses native Deno APIs and HuggingFace Inference API
- **Security-first**: API keys encrypted at rest, RLS enforced on all tables
- **Cost-efficient**: Free tier HF models (Mistral-7B, all-MiniLM) for default operations
- **Scalable**: pgvector with IVFFlat indexing for fast similarity search

### Core Components

#### Database Schema (PostgreSQL + pgvector)

- **projects**: User project metadata
- **chat_chunks**: Text chunks with 384-dim embeddings (sentence-transformers/all-MiniLM-L6-v2)
- **api_keys**: Encrypted user API keys (AES-256-GCM)

All tables have RLS policies ensuring users can only access their own data.

#### Edge Functions

1. **embed** - Generates and stores embeddings
   - Input: `{ projectId, content, metadata? }`
   - Uses HuggingFace `all-MiniLM-L6-v2` (384 dims)
   - Stores in `chat_chunks` table

2. **searchProject** - Vector similarity search
   - Input: `{ projectId, query, limit?, threshold? }`
   - Generates query embedding → calls `match_project_chunks` RPC
   - Returns relevant chunks with similarity scores

3. **metaChatProject** - RAG-powered chat
   - Input: `{ projectId, messages }`
   - Retrieves context via vector search
   - Calls Mistral-7B-Instruct via HuggingFace
   - Returns synthesized answer + context used

4. **manageApiKeys** - CRUD for user API keys
   - GET: List providers
   - POST: Add/update encrypted key
   - DELETE: Remove key

#### Utilities (`_shared/`)

- **supabaseClient.ts**: Client factory with auth passthrough
- **embeddings.ts**: HuggingFace embedding generation
- **encryption.ts**: AES-256-GCM encryption for API keys
- **cors.ts**: CORS headers
- **rateLimit.ts**: Rate limiting utilities (placeholder)

### Why These Choices?

**pgvector over Pinecone/Weaviate**: Keep everything in Supabase, no external dependencies, better cost at scale.

**HuggingFace over OpenAI**: Free tier, good quality for 384-dim embeddings. Users can optionally provide OpenAI keys.

**Mistral-7B-Instruct**: Best free model on HF Inference API for chat. Good balance of quality and speed.

**Edge Functions over Lambda**: Faster cold starts, built-in auth integration, simpler deployment.

**384 dimensions**: Sweet spot for quality vs. speed/cost. all-MiniLM-L6-v2 is industry-standard for semantic search.

---

## Environment Setup

### Required Environment Variables

Set these in Supabase Dashboard → Settings → Edge Functions:

```bash
HUGGING_FACE_ACCESS_TOKEN=hf_xxxxx  # Get from huggingface.co/settings/tokens
ENCRYPTION_KEY=<32-byte hex>         # Generate: openssl rand -hex 32
```

Optional (if supporting user's OpenAI keys):
```bash
OPENAI_API_KEY=sk-xxxxx              # Fallback key
```

### Generate Encryption Key

```bash
openssl rand -hex 32
```

---

## Deployment

### 1. Initialize Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy embed
supabase functions deploy searchProject
supabase functions deploy metaChatProject
supabase functions deploy manageApiKeys

# Set secrets
supabase secrets set HUGGING_FACE_ACCESS_TOKEN=hf_xxxxx
supabase secrets set ENCRYPTION_KEY=<your-key>
```

### 3. Enable pgvector

In Supabase Dashboard → Database → Extensions:
- Enable `vector` extension

Or via SQL:
```sql
create extension if not exists vector;
```

---

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Test embed function
curl -X POST http://localhost:54321/functions/v1/embed \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<uuid>",
    "content": "This is a test document about React hooks."
  }'

# Test search
curl -X POST http://localhost:54321/functions/v1/searchProject \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<uuid>",
    "query": "React hooks",
    "limit": 5
  }'

# Test chat
curl -X POST http://localhost:54321/functions/v1/metaChatProject \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<uuid>",
    "messages": [
      { "role": "user", "content": "What are React hooks?" }
    ]
  }'
```

### Production Testing

Replace `http://localhost:54321` with your Supabase project URL:
`https://<project-ref>.supabase.co`

---

## Scaling & Cost Notes

### Expected Scale: 10K–50K Users

#### Database (PostgreSQL)

- **Storage**: ~1GB per 10K users (assuming 100 chunks/user × 1KB each)
- **Compute**: Supabase Free tier handles up to 2GB database
- **Upgrade at**: ~20K active users → Pro Plan ($25/mo)

#### Edge Functions

- **Invocations**: Free tier = 500K/month
- **Typical usage**: ~50 requests/user/month = 10K users comfortably
- **Upgrade at**: 15K users → Pro Functions ($10/mo)

#### pgvector Performance

- **IVFFlat index**: Fast for <1M vectors
- **Query time**: <50ms for similarity search (384 dims)
- **Optimization**: Increase `lists` parameter in index as data grows

#### HuggingFace Inference API

- **Free tier**: Rate limited but generous
- **Latency**: 200-500ms for embeddings, 1-3s for Mistral
- **Cost at scale**: Consider self-hosting or switching to OpenAI for premium users

### Recommended Limits (Free Tier)

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Embeddings/user/day | 100 | Prevent abuse, ~3 docs/call |
| Searches/user/day | 500 | Primary use case |
| Chat messages/user/day | 50 | Rate limit LLM calls |
| Max chunk size | 2KB | Optimize embedding quality |
| Max chunks/project | 1000 | Scale gracefully |

### Cost Estimates (Pro Tier)

**For 50K users**:
- Supabase Pro: $25/mo (database) + $10/mo (functions) = **$35/mo**
- HuggingFace: Free (or $9/mo for faster inference)
- Total: **~$50/mo** base cost

**Per-user cost**: $0.001/month (excellent unit economics)

### Optimization Strategies

1. **Batch embeddings**: Process multiple chunks in one call
2. **Cache popular searches**: Use Redis for frequent queries
3. **Chunk intelligently**: Split on semantic boundaries, not character count
4. **HNSW index**: Upgrade from IVFFlat when >100K vectors
5. **User tiers**: Offer premium with OpenAI embeddings & GPT-4

---

## Monitoring & Observability

### Key Metrics to Track

- **Function latency**: p50, p95, p99 for each endpoint
- **Error rates**: Failed embeddings, search timeouts
- **Database growth**: Track `chat_chunks` table size
- **Rate limit hits**: Users hitting quotas

### Supabase Dashboard

- **Database**: Pooler statistics, slow queries
- **Functions**: Invocation counts, error logs
- **Auth**: Active users, signup trends

### Alerts to Set

- Error rate >5% on any function
- Database storage >80% of plan
- Function invocations >80% of monthly quota

---

## Security Best Practices

1. **Never expose service role key**: Only use in Edge Functions server-side
2. **Rotate encryption keys**: Plan for key rotation (requires re-encryption)
3. **Rate limit aggressively**: Protect against abuse
4. **Validate inputs**: Sanitize all user inputs in functions
5. **Monitor RLS**: Audit RLS policies regularly
6. **HTTPS only**: Enforce in production

---

## Future Enhancements

- [ ] Streaming responses for `metaChatProject`
- [ ] Batch embedding API for large imports
- [ ] Background job queue for heavy processing
- [ ] Advanced chunking strategies (semantic, hierarchical)
- [ ] Multi-modal embeddings (images, code)
- [ ] Fine-tuned embedding models per project
- [ ] Hybrid search (vector + keyword)
- [ ] Real-time collaboration on projects

---

## Troubleshooting

### Common Issues

**1. "Unauthorized" errors**
- Check: Auth token in `Authorization` header
- Verify: RLS policies allow user access

**2. "ENCRYPTION_KEY not set"**
- Set secret: `supabase secrets set ENCRYPTION_KEY=...`

**3. Slow vector searches**
- Check: Index exists on `chat_chunks.embedding`
- Optimize: Adjust `lists` parameter (higher = faster but less accurate)

**4. HuggingFace rate limits**
- Use: `wait_for_model: true` in requests
- Upgrade: HF Pro account or self-host models

**5. pgvector extension not found**
- Enable: In Supabase Dashboard → Database → Extensions

---

## License & Support

Built for ProjectPad AI. MIT Licensed.

For issues: [GitHub Issues](https://github.com/your-repo/issues)
