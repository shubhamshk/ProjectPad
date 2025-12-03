-- Match Project Chunks (Vector Search RPC)
create or replace function match_project_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_project_id uuid
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    chat_chunks.id,
    chat_chunks.content,
    chat_chunks.metadata,
    1 - (chat_chunks.embedding <=> query_embedding) as similarity
  from chat_chunks
  where 1 - (chat_chunks.embedding <=> query_embedding) > match_threshold
  and chat_chunks.project_id = filter_project_id
  order by chat_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
