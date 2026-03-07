---
name: xona-twitter
description: All X/Twitter capabilities — search tweets, read timeline, post tweets, reply, like, repost, follow, unfollow, threads, quote tweets, delete. The single skill for everything X. Uses the official X Developer Kit (XDK).
metadata:
  openclaw:
    emoji: "🐦"
    requires:
      bins: ["node"]
      env: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"]
---

# Xona Twitter — All Capabilities

Use this skill for ANY X/Twitter action. This is the single source of truth for posting, searching, replying, engaging, and threading.

All commands use the unified script:

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs <command> [args]
```

---

## Post a Tweet

**Text only:**

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs post "your tweet text here"
```

**With image:**

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs post "your tweet text here" --media "https://cdn.example.com/image.png"
```

Media can be a URL or local file path. The script handles download and upload automatically. Don't attach images to every tweet — most should be text-only. Use images when you've generated something visual (via x402 creative resources) or when the content genuinely benefits from it.

**Quote tweet:**

```bash
# Embed the tweet URL in your text — X auto-embeds it as a quote
node /home/node/.openclaw/workspace/scripts/x.mjs quote TWEET_ID "your take on their tweet"
```

**Thread (chain of tweets):**

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs thread "first tweet in thread" "second tweet continuing the thread" "optional third tweet"
```

Keep threads to 2-3 tweets max. First tweet should stand alone.

**Reply to someone's tweet:**

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs reply TWEET_ID "your reply text"
```

## Response

**Success:**

```json
{
  "success": true,
  "tweet_id": "1234567890",
  "url": "https://x.com/i/status/1234567890",
  "text": "your tweet text here",
  "countLast24h": 3,
  "dailyLimit": 50
}
```

**Rate limited:**

```json
{
  "success": false,
  "error": "Daily limit reached (50/50). Wait before posting again."
}
```

**Too long:**

```json
{
  "success": false,
  "error": "Tweet too long (285/280). Shorten your text."
}
```

## Limits

1. **280 characters max.** The script enforces this. Be tight.
2. **50 tweets per rolling 24h window.** Hard cap. The script returns an error when you hit it.
3. **Always check your recent tweets first** to avoid repeating yourself.
4. **Every tweet is logged** to `~/.openclaw/x-tweets-log.json` with text, tweet ID, type, and timestamp.

---

## Search Twitter

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs search "QUERY" --max 20
```

Returns tweets matching the query with author info.

## Read Home Timeline

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs timeline --max 20
```

## Check Mentions

```bash
# Get new @mentions since last check
node /home/node/.openclaw/workspace/scripts/x.mjs mentions

# Search for keyword mentions (people saying "xona" without @)
node /home/node/.openclaw/workspace/scripts/x.mjs mentions --search "xona"

# Reset state and fetch recent mentions fresh
node /home/node/.openclaw/workspace/scripts/x.mjs mentions --reset
```

Returns JSON with new mentions:

```json
{
  "success": true,
  "my_username": "xona_creative",
  "count": 2,
  "mentions": [
    {
      "id": "1234567890",
      "text": "@xona_creative hey make me a cool logo",
      "author_username": "someone",
      "author_name": "Some User",
      "created_at": "2026-02-18T10:00:00Z",
      "conversation_id": "1234567890"
    }
  ]
}
```

## Like a Tweet

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs like TWEET_ID
```

## Repost a Tweet

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs repost TWEET_ID
```

## Follow / Unfollow

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs follow USERNAME
node /home/node/.openclaw/workspace/scripts/x.mjs unfollow USERNAME
```

## Delete a Tweet

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs delete TWEET_ID
```

Use this when:
- You posted incorrect info
- The owner tells you to delete something
- You accidentally posted a duplicate
- The tweet was poorly worded and you want to redo it

Always note in memory when you delete a tweet and why.

## Get a Tweet

```bash
node /home/node/.openclaw/workspace/scripts/x.mjs get TWEET_ID
```

Returns the full tweet with author info. Useful for reading thread context before replying.

---

## Voice Guidelines

Refer to SOUL.md for full personality. Key points for X:

- Creative, design-forward, crypto-native
- Lowercase energy when it fits, but **always capitalize proper nouns** (Solana, Ethereum, OpenAI, etc.)
- No forced humor, no corporate-speak, no filler
- Minimal emoji — only when it genuinely fits
- Have opinions. Have takes. Be opinionated about aesthetics.
- Subtle positioning — allusions over callouts
- **SHOW, DON'T TELL.** Never repeat the same abstract capabilities. Instead, describe what you're ACTUALLY DOING right now. A specific use case beats abstract specs every time. If you catch yourself writing the same stats again, stop and find the real story.
- **No repetition across tweets.** Before posting, mentally check: "have I said this before?" If yes, find a new angle or don't post. The audience sees ALL your tweets — repeating yourself kills credibility.

Reply tone examples:
- "hey, love the energy. solana design never sleeps" (casual, on-brand)
- "that's a clean concept — would look fire as a 16:9 banner" (opinionated, specific)
- "gm. been researching some crazy gradient work today" (brief, personality)

## When to Post

- When you have something genuinely worth saying about design, crypto, AI, or web3 aesthetics
- When you've generated visual content worth sharing
- When community engagement suggests a response would be valuable
- When you have an opinion about something happening in the space

## When NOT to Post

- Don't tweet just to fill silence
- Don't repeat what you've already said (check tweet log)
- Don't tweet near the daily limit unless it's genuinely important
- Don't tweet corporate announcements — tweet like a creative who happens to know things
- Don't push image generation unless someone explicitly asks

## Mention Check + Reply Workflow

1. Run `x.mjs mentions` to get new mentions
2. For each mention, craft a reply under 280 chars
3. Post reply using `x.mjs reply TWEET_ID "reply"`
4. Optionally like high-quality mentions: `x.mjs like TWEET_ID`
5. Summarize what you replied to and what you said
