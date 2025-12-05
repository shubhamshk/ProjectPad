-- Add encrypted HuggingFace API key columns to profiles
-- Encryption: AES-GCM with server-side MASTER_KEY

-- Add columns for encrypted HF key storage
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hf_key_enc TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hf_key_valid BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.hf_key_enc IS 'AES-GCM encrypted HuggingFace API key as JSON {iv, ct}';
COMMENT ON COLUMN profiles.hf_key_valid IS 'Whether the stored HF key has been validated';

-- RLS policy: Users can only view their own encrypted key
DROP POLICY IF EXISTS "Users can view own hf_key" ON profiles;
CREATE POLICY "Users can view own hf_key"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- RLS policy: Users can only update their own encrypted key
DROP POLICY IF EXISTS "Users can update own hf_key" ON profiles;
CREATE POLICY "Users can update own hf_key"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
