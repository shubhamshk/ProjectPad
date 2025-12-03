# Free Open-Source AI Models Setup

## Overview

ProjectPad AI now supports **5 FREE open-source models** powered by HuggingFace Inference API:

- 🟠 **Mistral 7B** - General purpose, fast
- 🔵 **Qwen 7B** - Powerful multilingual model
- 🔵 **Qwen 14B** - Larger, smarter version
- 🩷 **Llama 3.1 8B** - Meta's powerful model
- 🟣 **DeepSeek R1** - Reasoning-optimized

## Setup Instructions

### 1. Get a Free HuggingFace API Token

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name it "ProjectPad AI"
4. Select "Read" permissions
5. Click "Generate"
6. Copy the token (starts with `hf_...`)

### 2. Add to Your Project

**Option A: Environment Variable (Recommended)**

Create or edit `.env.local`:

```bash
VITE_HF_TOKEN=hf_your_token_here
```

**Option B: Settings UI**

1. Open your project
2. Go to Settings
3. Find "HuggingFace API Key"
4. Paste your token
5. Save

### 3. Select a Free Model

1. Open any project chat
2. Click the model selector dropdown (top of chat)
3. Scroll to "🆓 Free Open-Source Models" section
4. Choose any model with the green "FREE" badge
5. Start chatting!

## Model Comparison

| Model | Size | Best For | Speed | Quality |
|-------|------|----------|-------|---------|
| Mistral 7B | 7B | General tasks | ⚡⚡⚡ | ★★★☆☆ |
| Qwen 7B | 7B | Multilingual, code | ⚡⚡⚡ | ★★★★☆ |
| Qwen 14B | 14B | Complex reasoning | ⚡⚡☆ | ★★★★★ |
| Llama 3.1 8B | 8B | Balanced performance | ⚡⚡⚡ | ★★★★☆ |
| DeepSeek R1 | 7B | Math, reasoning | ⚡⚡☆ | ★★★★★ |

## First Use Note

⏳ **Cold Start**: Free models need 20-30 seconds to "wake up" on first use. After that, they're fast!

If you see "Model is loading...", just wait and try again in 30 seconds.

## Cost

✅ **100% FREE** - HuggingFace provides a generous free tier for inference.

No credit card required!

## Troubleshooting

### "HuggingFace API Key missing"
- Make sure you added your token to `.env.local` or Settings
- Token should start with `hf_`
- Restart your dev server after adding to `.env.local`

### "Model is loading..."
- Wait 20-30 seconds
- Try again
- This only happens on first use or after long inactivity

### "Invalid HuggingFace API Key"
- Token might be expired or revoked
- Generate a new one at huggingface.co/settings/tokens
- Make sure it has "Read" permissions

### Slow responses
- Free models can be slower during peak times
- Try a smaller model (7B vs 14B)
- Or use Gemini/GPT for faster responses

## Why These Models?

- **Mistral 7B**: Industry-standard open model, great for general chat
- **Qwen**: Alibaba's powerful models, excellent for code and multilingual tasks
- **Llama 3.1**: Meta's flagship open model, well-balanced
- **DeepSeek R1**: Specialized for reasoning and complex problem-solving

All models are **100% free** and run on HuggingFace's infrastructure!

## Need Help?

- HuggingFace Docs: https://huggingface.co/docs/api-inference
- Token Issues: https://huggingface.co/settings/tokens
- Model Status: https://status.huggingface.co

Enjoy your free AI models! 🚀
