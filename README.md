# Clawna

Xona — creative AI design agent — powered by [OpenClaw](https://openclaw.ai).

Researches trending design, generates images and videos via [x402](https://x402.org) resource APIs on `api.xona-agent.com`.

## Architecture

```
┌──────────────────────────────┐    x402     ┌──────────────────────────────┐
│  OpenClaw Gateway (clawna)   │   (USDC)    │  api.xona-agent.com          │
│                              │ ──────────→ │                              │
│  SOUL.md    → identity       │             │  /image/creative-director    │
│  skills/    → capabilities   │  x402-fetch │  /image/designer             │
│  scripts/   → x402 payments  │   .js       │  /image/nano-banana          │
│  Telegram / Discord / Web UI │             │  /video/short-generation     │
└──────────────────────────────┘             │  /ai/x-news                 │
                                             │  /token/pumpfun-trending     │
                                             └──────────────────────────────┘
```

## Skill

| Skill | Description |
|-------|-------------|
| `x402-creative-resources` | All x402 APIs: creative director, image gen (6 models), video gen, X news, PumpFun intel |

### x402 Resources

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/image/creative-director` | POST | $0.03 | Design research via X/Google + refined prompt |
| `/image/grok-imagine` | POST | $0.04 | Artistic image gen, text-in-image |
| `/image-model/qwen-image` | POST | $0.05 | Balanced quality/cost |
| `/image/designer` | POST | $0.08 | Style blending image gen |
| `/image-model/seedream-4.5` | POST | $0.08 | Photorealistic image gen |
| `/image/nano-banana` | POST | $0.10 | Fast creative image gen |
| `/image/nano-banana-pro` | POST | $0.20 | Highest quality image gen |
| `/video/short-generation` | POST | $0.50 | 10-second AI video |
| `/ai/x-news` | POST | $0.50 | X news extraction + tweet draft + banner |
| `/token/pumpfun-trending` | GET | $0.10 | Trending PumpFun tokens |
| `/token/pumpfun-movers` | GET | $0.10 | Top PumpFun movers |

## Quick Start

### Prerequisites

- Docker & Docker Compose v2
- Anthropic API key (or OpenAI as fallback)
- Solana wallet with USDC (for x402 payments)

### Setup

```bash
# 1. Copy env template and fill in your keys
cp env.example .env

# 2. Start the OpenClaw gateway
docker compose up -d

# 3. Open the Control UI
open http://127.0.0.1:18790
```

### Agent Wallet Setup

The agent needs a funded Solana wallet to pay for x402 resources. Add to `.env`:

```bash
XONA_WALLET_SECRET=<your-solana-private-key-base58>
XONA_WALLET_ADDRESS=<your-solana-public-key>
```

Fund the wallet with USDC on Solana mainnet. Even $5-10 is enough for hundreds of API calls.

### Chat Locally

Use the web Control UI at `http://127.0.0.1:18790`.

### Connect Telegram (optional)

Add `TELEGRAM_BOT_TOKEN` to `.env`, then restart:

```bash
docker compose restart openclaw-gateway
```

## Project Structure

```
clawna/
├── SOUL.md              # Xona's static identity (always loaded)
├── AGENTS.md            # Additional agent instructions
├── openclaw.json        # Agent config (model, sandbox, identity)
├── docker-compose.yml   # Runs OpenClaw gateway
├── env.example          # Environment template
├── .env                 # Your secrets (gitignored)
│
├── scripts/
│   ├── x402-fetch.js    # x402 payment proxy (handles USDC payments)
│   └── package.json     # Script dependencies (@dexterai/x402)
│
└── skills/
    └── x402-creative-resources/
        └── SKILL.md     # All x402 API resources in one skill
```

## How It Works

1. **SOUL.md** is loaded every session — defines who Xona is
2. **x402-creative-resources** skill is activated when the user asks for design research, image/video generation, news, or token intel
3. The LLM calls `x402-fetch.js` which handles Solana USDC payments automatically via `@dexterai/x402`
4. Generated content is hosted on CDN — URLs are returned to the user
5. Everything auto-restarts on reboot (`restart: unless-stopped`)
