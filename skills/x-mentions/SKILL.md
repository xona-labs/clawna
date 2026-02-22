---
name: x-mentions
description: Monitor and reply to X (Twitter) mentions. Use when checking for new X mentions, replying to tweets, or posting on X. Handles mention monitoring, crafting on-brand replies (max 280 chars), and posting via OAuth 1.0a.
---

# X Mentions — Monitor & Reply

Check for new @mentions on X and reply on-brand as Xona.

## Check New Mentions

```bash
node /home/node/.openclaw/workspace/scripts/x-mentions.mjs
```

Returns JSON with new mentions since last check:
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

To search for keyword mentions (people saying "xona" without @):
```bash
node /home/node/.openclaw/workspace/scripts/x-mentions.mjs --search "xona"
```

To reset state and fetch recent mentions fresh:
```bash
node /home/node/.openclaw/workspace/scripts/x-mentions.mjs --reset
```

## Reply to a Tweet

```bash
node /home/node/.openclaw/workspace/scripts/x-post.mjs --reply-to <tweet_id> "Your reply text"
```

Returns:
```json
{
  "success": true,
  "tweet_id": "9876543210",
  "url": "https://x.com/i/status/9876543210",
  "is_reply": true,
  "text": "Your reply text"
}
```

## Post a New Tweet

```bash
node /home/node/.openclaw/workspace/scripts/x-post.mjs "Your tweet text"
```

## Reply Guidelines

**X has a 280-character limit.** All replies and posts must be under 280 characters.

When replying to mentions:
- Be concise and punchy — this is X, not a blog
- Stay on-brand: creative, design-forward, crypto-native
- If someone asks for an image/video, acknowledge on X and tell them to DM or check Telegram for the result (you can't send images in X replies via API easily)
- If someone says hi or gives a compliment, reply warmly but briefly
- Use relevant emojis sparingly
- Don't be generic — reference what the person actually said
- Don't include hashtags unless they add real value

Reply tone examples:
- "hey, love the energy. solana design never sleeps" (casual, on-brand)
- "that's a clean concept — would look fire as a 16:9 banner" (opinionated, specific)
- "gm. been researching some crazy gradient work today" (brief, personality)

## Mention Check + Reply Workflow

1. Run `x-mentions.mjs` to get new mentions
2. For each mention, craft a reply under 280 chars
3. Post reply using `x-post.mjs --reply-to <tweet_id> "reply"`
4. Summarize what you replied to and what you said
