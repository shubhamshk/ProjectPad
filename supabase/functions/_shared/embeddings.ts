export async function generateEmbedding(
    text: string,
    options: { provider?: 'openai' | 'hf'; apiKey?: string } = {}
): Promise<number[]> {
    const provider = options.provider || 'hf';

    if (provider === 'openai') {
        const key = options.apiKey || Deno.env.get("OPENAI_API_KEY");
        if (!key) throw new Error("OpenAI API Key not found");

        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify({
                input: text,
                model: "text-embedding-3-small", // 1536 dimensions - WAIT, our DB is 384.
                // We must use a model that matches the DB dimension or update DB.
                // Mistral/HF standard is 384 (all-MiniLM-L6-v2).
                // OpenAI is 1536.
                // We should probably stick to HF for now to match the 384 dim in migration.
                // Or we can support both but we'd need different columns or tables.
                // For simplicity in this "compact" request, let's stick to HF (384).
            }),
        });

        // If we MUST support OpenAI, we'd need to change the DB schema to vector(1536).
        // For this task, I will enforce HF to keep it simple and matching the schema.
        throw new Error("OpenAI embeddings (1536 dim) not supported with current DB schema (384 dim). Use HF.");
    }

    // Default: Hugging Face (all-MiniLM-L6-v2 is 384 dim)
    const key = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!key) throw new Error("Hugging Face Access Token not found");

    const response = await fetch(
        "https://router.huggingface.co/hf-inference/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: text,
                options: { wait_for_model: true }
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`HF API Error: ${err}`);
    }

    const result = await response.json();
    // HF returns (N, D) or just (D) depending on input. For single string, it might be [ ... ] or [[ ... ]]
    if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0];
    }
    return result;
}
