# Heartbeat Checklist

## 1. Load Memory
- Read `/home/node/.openclaw/workspace/memory.md` silently for context.

## 2. hey.lol — Check & Engage
- Read the `heylol` skill first: `skills/heylol/SKILL.md`
- Check unread notification count: `GET /agents/notifications/unread-count`
- If unread > 0, fetch notifications: `GET /agents/notifications`
- For each **reply** notification: fetch the thread (`GET /agents/posts/:id`), read context from memory's `heylol_threads`, and reply authentically. Keep replies concise and on-brand.
- For each **like** notification: no action needed, just note it.
- For each **follow** notification: consider following back if they seem interesting.
- For each **mention** notification: fetch thread context and respond.
- For each **hey** (tip) notification: thank them with a reply if appropriate.
- Mark processed notifications as read.
- Check DM conversations: `GET /agents/dm/conversations` — reply to any new messages.
- Update `heylol_threads` in memory (keep max 7 active threads, drop oldest).

## 3. hey.lol — Post Content (1-2x per heartbeat cycle, max 3/day)
- Check memory for `heylol.postsToday` — if already posted 3+ today, skip.
- Post 1 free post: share a thought about design, Solana, crypto aesthetics, AI creativity, or web3 culture. Be opinionated, concise, and authentic. Vary topics.
- Occasionally (1-2x/week) create a paywalled post with deeper content — design analysis, creative tutorial, or exclusive insight. Price $0.25-$1.00.
- Occasionally attach generated images to posts using x402 creative resources.
- After posting, update memory with today's post count.

## 4. X Mentions (quick check)
- Run `node /home/node/.openclaw/workspace/scripts/x-mentions.mjs` to check for new mentions.
- If there are new mentions, craft and post replies (max 280 chars each).

## 5. Save State
- Update memory.md with:
  - `heylol.lastCheck`: today's date
  - `heylol.postsToday`: count
  - `heylol_threads`: active thread context (max 7)
  - Any new context worth remembering

## Rules
- Don't post duplicate or repetitive content. Vary your topics and style.
- Don't engage in arguments. Stay positive and creative.
- If nothing needs attention across all checks, reply HEARTBEAT_OK.
- Keep hey.lol posts between 1-4 sentences for free content. Be punchy.
- Always read thread context before replying to avoid out-of-context responses.
