#!/usr/bin/env node
/**
 * Unified X (Twitter) script — all capabilities in one place.
 * Uses the official X Developer Kit (XDK).
 *
 * Subcommands:
 *   node x.mjs post "text" [--media "url_or_path"]
 *   node x.mjs reply TWEET_ID "text"
 *   node x.mjs quote TWEET_ID "text"
 *   node x.mjs thread "tweet1" "tweet2" ["tweet3"]
 *   node x.mjs search "query" [--max N]
 *   node x.mjs mentions [--reset] [--search "keyword"]
 *   node x.mjs timeline [--max N]
 *   node x.mjs like TWEET_ID
 *   node x.mjs repost TWEET_ID
 *   node x.mjs follow USERNAME
 *   node x.mjs unfollow USERNAME
 *   node x.mjs delete TWEET_ID
 *   node x.mjs get TWEET_ID
 *
 * Env vars required:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 *
 * State dir: ~/.openclaw/
 */

import { Client, OAuth1 } from '@xdevplatform/xdk';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import https from 'https';
import http from 'http';
import { createWriteStream, unlinkSync } from 'fs';

// --- Constants ---
const STATE_DIR = join(homedir(), '.openclaw');
const MENTIONS_STATE_FILE = join(STATE_DIR, 'x-mentions-since.json');
const TWEETS_LOG_FILE = join(STATE_DIR, 'x-tweets-log.json');
const DAILY_LIMIT = 50;
const MAX_TWEET_LENGTH = 280;

// --- Helpers ---

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function err(obj) {
  console.error(JSON.stringify(obj, null, 2));
  process.exit(1);
}

function getClient() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    err({
      success: false,
      error: 'Missing X API credentials. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET',
    });
  }

  const oauth1 = new OAuth1({
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret: accessSecret,
    callback: 'oob',
  });

  return new Client({ oauth1 });
}

function loadJSON(filepath) {
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveJSON(filepath, data) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function loadTweetsLog() {
  const data = loadJSON(TWEETS_LOG_FILE);
  return Array.isArray(data) ? data : [];
}

function saveTweetsLog(log) {
  saveJSON(TWEETS_LOG_FILE, log);
}

function logTweet(id, text, type) {
  const log = loadTweetsLog();
  log.unshift({ id, text, type, timestamp: new Date().toISOString() });
  // Keep last 500 entries
  saveTweetsLog(log.slice(0, 500));
}

function countLast24h() {
  const log = loadTweetsLog();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return log.filter((t) => new Date(t.timestamp).getTime() > cutoff).length;
}

function checkDailyLimit() {
  const count = countLast24h();
  if (count >= DAILY_LIMIT) {
    err({
      success: false,
      error: `Daily limit reached (${count}/${DAILY_LIMIT}). Wait before posting again.`,
    });
  }
  return count;
}

function validateLength(text) {
  if (text.length > MAX_TWEET_LENGTH) {
    err({
      success: false,
      error: `Tweet too long (${text.length}/${MAX_TWEET_LENGTH}). Shorten your text.`,
    });
  }
}

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

async function getMyId(client) {
  const me = await client.users.getMe();
  return { id: me.data?.id, username: me.data?.username };
}

/**
 * Download a file from URL to a temp path, return the path
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const tmpPath = join(STATE_DIR, `tmp-media-${Date.now()}`);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      const stream = createWriteStream(tmpPath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve(tmpPath);
      });
    }).on('error', reject);
  });
}

// --- Subcommands ---

async function cmdPost(client, args) {
  // Collect text (first non-flag arg after 'post')
  let text = null;
  let mediaPath = getArg(args, '--media');

  for (const a of args) {
    if (a === '--media') continue;
    if (a === mediaPath) continue;
    if (!text) { text = a; continue; }
  }

  if (!text) err({ success: false, error: 'Usage: node x.mjs post "text" [--media "url_or_path"]' });
  validateLength(text);
  const count = checkDailyLimit();

  const params = { text };

  // Handle media upload
  if (mediaPath) {
    let filePath = mediaPath;
    let downloaded = false;

    // If it's a URL, download first
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      filePath = await downloadFile(mediaPath);
      downloaded = true;
    }

    try {
      const mediaData = readFileSync(filePath);
      const uploadResult = await client.media.upload({
        media_data: mediaData.toString('base64'),
        media_category: 'tweet_image',
      });
      if (uploadResult?.media_id_string) {
        params.media = { media_ids: [uploadResult.media_id_string] };
      }
    } catch (e) {
      // Clean up temp file if downloaded
      if (downloaded && existsSync(filePath)) unlinkSync(filePath);
      err({ success: false, error: `Media upload failed: ${e.message}` });
    }

    if (downloaded && existsSync(filePath)) unlinkSync(filePath);
  }

  const result = await client.posts.create(params);
  const tweetId = result.data?.id;
  const url = `https://x.com/i/status/${tweetId}`;

  logTweet(tweetId, text, mediaPath ? 'post+media' : 'post');

  out({
    success: true,
    tweet_id: tweetId,
    url,
    text,
    mediaAttached: !!mediaPath,
    countLast24h: count + 1,
    dailyLimit: DAILY_LIMIT,
  });
}

async function cmdReply(client, args) {
  const tweetId = args[0];
  const text = args[1];
  if (!tweetId || !text) err({ success: false, error: 'Usage: node x.mjs reply TWEET_ID "text"' });
  validateLength(text);
  const count = checkDailyLimit();

  const result = await client.posts.create({
    text,
    reply: { in_reply_to_tweet_id: tweetId },
  });
  const newId = result.data?.id;
  const url = `https://x.com/i/status/${newId}`;

  logTweet(newId, text, 'reply');

  out({
    success: true,
    tweet_id: newId,
    url,
    is_reply: true,
    reply_to: tweetId,
    text,
    countLast24h: count + 1,
    dailyLimit: DAILY_LIMIT,
  });
}

async function cmdQuote(client, args) {
  const quotedId = args[0];
  const text = args[1];
  if (!quotedId || !text) err({ success: false, error: 'Usage: node x.mjs quote TWEET_ID "text"' });
  validateLength(text);
  const count = checkDailyLimit();

  // Use URL-in-text approach (quote_tweet_id can return 403)
  const { username } = await getMyId(client);
  const quoteUrl = `https://x.com/i/status/${quotedId}`;
  const fullText = `${text}\n\n${quoteUrl}`;

  // Don't validate combined length — Twitter handles embedded URLs differently
  const result = await client.posts.create({ text: fullText });
  const newId = result.data?.id;
  const url = `https://x.com/i/status/${newId}`;

  logTweet(newId, text, 'quote');

  out({
    success: true,
    tweet_id: newId,
    url,
    is_quote: true,
    quoted_tweet: quotedId,
    text,
    countLast24h: count + 1,
    dailyLimit: DAILY_LIMIT,
  });
}

async function cmdThread(client, args) {
  if (args.length < 2) err({ success: false, error: 'Usage: node x.mjs thread "tweet1" "tweet2" ["tweet3"]' });
  if (args.length > 5) err({ success: false, error: 'Threads should be 2-5 tweets max.' });

  for (const t of args) validateLength(t);
  const count = checkDailyLimit();
  if (count + args.length > DAILY_LIMIT) {
    err({ success: false, error: `Thread would exceed daily limit (${count}+${args.length}/${DAILY_LIMIT}).` });
  }

  const tweets = [];
  let prevId = null;

  for (let i = 0; i < args.length; i++) {
    const params = { text: args[i] };
    if (prevId) {
      params.reply = { in_reply_to_tweet_id: prevId };
    }
    const result = await client.posts.create(params);
    const id = result.data?.id;
    prevId = id;
    tweets.push({
      index: i + 1,
      tweet_id: id,
      url: `https://x.com/i/status/${id}`,
      text: args[i],
    });
    logTweet(id, args[i], i === 0 ? 'thread-start' : 'thread-reply');
  }

  out({
    success: true,
    thread_length: tweets.length,
    tweets,
    countLast24h: count + tweets.length,
    dailyLimit: DAILY_LIMIT,
  });
}

async function cmdSearch(client, args) {
  const query = args[0];
  if (!query) err({ success: false, error: 'Usage: node x.mjs search "query" [--max N]' });
  const max = parseInt(getArg(args.slice(1), '--max') || '20', 10);

  const result = await client.posts.searchRecent({
    query,
    maxResults: Math.min(max, 100),
    postFields: ['author_id', 'created_at', 'conversation_id', 'text'],
    userFields: ['username', 'name'],
    expansions: ['author_id'],
  });

  const users = {};
  if (result.includes?.users) {
    for (const u of result.includes.users) users[u.id] = u;
  }

  const tweets = (result.data || []).map((t) => ({
    id: t.id,
    text: t.text,
    author_username: users[t.author_id]?.username || 'unknown',
    author_name: users[t.author_id]?.name || 'unknown',
    created_at: t.created_at,
    conversation_id: t.conversation_id,
  }));

  out({ success: true, query, count: tweets.length, tweets });
}

async function cmdMentions(client, args) {
  const reset = hasFlag(args, '--reset');
  const searchQuery = getArg(args, '--search');
  const state = reset ? {} : loadJSON(MENTIONS_STATE_FILE);

  const { id: myId, username: myUsername } = await getMyId(client);
  let tweets = [];

  if (searchQuery) {
    const params = {
      query: searchQuery,
      maxResults: 10,
      postFields: ['author_id', 'created_at', 'conversation_id', 'in_reply_to_user_id'],
      userFields: ['username', 'name'],
      expansions: ['author_id'],
    };
    if (state.searchSinceId && !reset) params.sinceId = state.searchSinceId;

    const result = await client.posts.searchRecent(params);
    const users = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) users[u.id] = u;
    }

    for (const tweet of result.data || []) {
      if (tweet.author_id === myId) continue;
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        author_username: users[tweet.author_id]?.username || 'unknown',
        author_name: users[tweet.author_id]?.name || 'unknown',
        created_at: tweet.created_at,
        conversation_id: tweet.conversation_id,
      });
    }
    if (tweets.length > 0) state.searchSinceId = tweets[0].id;
  } else {
    const params = {
      maxResults: 10,
      postFields: ['author_id', 'created_at', 'conversation_id', 'in_reply_to_user_id'],
      userFields: ['username', 'name'],
      expansions: ['author_id'],
    };
    if (state.sinceId && !reset) params.sinceId = state.sinceId;

    const result = await client.users.getMentions(myId, params);
    const users = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) users[u.id] = u;
    }

    for (const tweet of result.data || []) {
      if (tweet.author_id === myId) continue;
      tweets.push({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        author_username: users[tweet.author_id]?.username || 'unknown',
        author_name: users[tweet.author_id]?.name || 'unknown',
        created_at: tweet.created_at,
        conversation_id: tweet.conversation_id,
      });
    }
    if (tweets.length > 0) state.sinceId = tweets[0].id;
  }

  saveJSON(MENTIONS_STATE_FILE, state);
  out({ success: true, my_username: myUsername, count: tweets.length, mentions: tweets });
}

async function cmdTimeline(client, args) {
  const max = parseInt(getArg(args, '--max') || '20', 10);
  const { id: myId } = await getMyId(client);

  const result = await client.users.getTimeline(myId, {
    maxResults: Math.min(max, 100),
    postFields: ['author_id', 'created_at', 'text'],
    userFields: ['username', 'name'],
    expansions: ['author_id'],
  });

  const users = {};
  if (result.includes?.users) {
    for (const u of result.includes.users) users[u.id] = u;
  }

  const tweets = (result.data || []).map((t) => ({
    id: t.id,
    text: t.text,
    author_username: users[t.author_id]?.username || 'unknown',
    author_name: users[t.author_id]?.name || 'unknown',
    created_at: t.created_at,
  }));

  out({ success: true, count: tweets.length, tweets });
}

async function cmdLike(client, args) {
  const tweetId = args[0];
  if (!tweetId) err({ success: false, error: 'Usage: node x.mjs like TWEET_ID' });

  await client.users.likePost(tweetId);
  out({ success: true, liked: tweetId });
}

async function cmdRepost(client, args) {
  const tweetId = args[0];
  if (!tweetId) err({ success: false, error: 'Usage: node x.mjs repost TWEET_ID' });

  await client.users.repostPost(tweetId);
  logTweet(tweetId, '[repost]', 'repost');
  out({ success: true, reposted: tweetId });
}

async function cmdFollow(client, args) {
  const username = args[0]?.replace(/^@/, '');
  if (!username) err({ success: false, error: 'Usage: node x.mjs follow USERNAME' });

  const target = await client.users.getByUsername(username);
  const targetId = target.data?.id;
  if (!targetId) err({ success: false, error: `User @${username} not found.` });

  await client.users.followUser(targetId);
  out({ success: true, followed: username, target_id: targetId });
}

async function cmdUnfollow(client, args) {
  const username = args[0]?.replace(/^@/, '');
  if (!username) err({ success: false, error: 'Usage: node x.mjs unfollow USERNAME' });

  const { id: myId } = await getMyId(client);
  const target = await client.users.getByUsername(username);
  const targetId = target.data?.id;
  if (!targetId) err({ success: false, error: `User @${username} not found.` });

  await client.users.unfollowUser(myId, targetId);
  out({ success: true, unfollowed: username, target_id: targetId });
}

async function cmdDelete(client, args) {
  const tweetId = args[0];
  if (!tweetId) err({ success: false, error: 'Usage: node x.mjs delete TWEET_ID' });

  await client.posts.delete(tweetId);
  out({ success: true, deleted: tweetId });
}

async function cmdGet(client, args) {
  const tweetId = args[0];
  if (!tweetId) err({ success: false, error: 'Usage: node x.mjs get TWEET_ID' });

  const result = await client.posts.getById(tweetId, {
    postFields: ['author_id', 'created_at', 'conversation_id', 'text', 'in_reply_to_user_id'],
    userFields: ['username', 'name'],
    expansions: ['author_id'],
  });

  const users = {};
  if (result.includes?.users) {
    for (const u of result.includes.users) users[u.id] = u;
  }
  const t = result.data;
  const author = users[t?.author_id];

  out({
    success: true,
    tweet: {
      id: t?.id,
      text: t?.text,
      author_username: author?.username || 'unknown',
      author_name: author?.name || 'unknown',
      created_at: t?.created_at,
      conversation_id: t?.conversation_id,
    },
  });
}

// --- Main Router ---

async function main() {
  const [subcommand, ...args] = process.argv.slice(2);

  if (!subcommand) {
    err({
      success: false,
      error: 'Usage: node x.mjs <command> [args]\nCommands: post, reply, quote, thread, search, mentions, timeline, like, repost, follow, unfollow, delete, get',
    });
  }

  const client = getClient();

  try {
    switch (subcommand) {
      case 'post':     await cmdPost(client, args); break;
      case 'reply':    await cmdReply(client, args); break;
      case 'quote':    await cmdQuote(client, args); break;
      case 'thread':   await cmdThread(client, args); break;
      case 'search':   await cmdSearch(client, args); break;
      case 'mentions': await cmdMentions(client, args); break;
      case 'timeline': await cmdTimeline(client, args); break;
      case 'like':     await cmdLike(client, args); break;
      case 'repost':   await cmdRepost(client, args); break;
      case 'follow':   await cmdFollow(client, args); break;
      case 'unfollow': await cmdUnfollow(client, args); break;
      case 'delete':   await cmdDelete(client, args); break;
      case 'get':      await cmdGet(client, args); break;
      default:
        err({ success: false, error: `Unknown command: ${subcommand}. Run without args to see usage.` });
    }
  } catch (error) {
    err({ success: false, error: error.message, code: error.code });
  }
}

main();
