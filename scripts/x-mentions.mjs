#!/usr/bin/env node
/**
 * Check X (Twitter) mentions — returns new mentions since last check
 *
 * Usage:
 *   node x-mentions.mjs                  # Get new mentions
 *   node x-mentions.mjs --reset          # Clear last-seen state and get recent mentions
 *   node x-mentions.mjs --search "xona"  # Search for keyword instead of @mentions
 *
 * Env vars required:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 *
 * State file: ~/.openclaw/x-mentions-since.json
 */

import { TwitterApi } from 'twitter-api-v2';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATE_DIR = join(homedir(), '.openclaw');
const STATE_FILE = join(STATE_DIR, 'x-mentions-since.json');

function getClient() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error(JSON.stringify({
      success: false,
      error: 'Missing X API credentials. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET'
    }));
    process.exit(1);
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const searchIdx = args.indexOf('--search');
  const searchQuery = searchIdx !== -1 ? args[searchIdx + 1] : null;

  const client = getClient();
  const state = reset ? {} : loadState();

  try {
    const me = await client.v2.me();
    const myId = me.data.id;
    const myUsername = me.data.username;

    let tweets = [];
    let newestId = state.sinceId || null;

    if (searchQuery) {
      const params = {
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at', 'conversation_id', 'in_reply_to_user_id'],
        'user.fields': ['username', 'name'],
        expansions: ['author_id'],
      };
      if (state.searchSinceId && !reset) {
        params.since_id = state.searchSinceId;
      }

      const result = await client.v2.search(searchQuery, params);
      const users = {};
      if (result.includes?.users) {
        for (const u of result.includes.users) {
          users[u.id] = u;
        }
      }

      for (const tweet of result.data?.data || []) {
        if (tweet.author_id === myId) continue;
        const author = users[tweet.author_id];
        tweets.push({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id,
          author_username: author?.username || 'unknown',
          author_name: author?.name || 'unknown',
          created_at: tweet.created_at,
          conversation_id: tweet.conversation_id,
        });
      }

      if (tweets.length > 0) {
        state.searchSinceId = tweets[0].id;
      }
    } else {
      const params = {
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at', 'conversation_id', 'in_reply_to_user_id'],
        'user.fields': ['username', 'name'],
        expansions: ['author_id'],
      };
      if (newestId && !reset) {
        params.since_id = newestId;
      }

      const result = await client.v2.userMentionTimeline(myId, params);
      const users = {};
      if (result.includes?.users) {
        for (const u of result.includes.users) {
          users[u.id] = u;
        }
      }

      for (const tweet of result.data?.data || []) {
        if (tweet.author_id === myId) continue;
        const author = users[tweet.author_id];
        tweets.push({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id,
          author_username: author?.username || 'unknown',
          author_name: author?.name || 'unknown',
          created_at: tweet.created_at,
          conversation_id: tweet.conversation_id,
        });
      }

      if (tweets.length > 0) {
        state.sinceId = tweets[0].id;
      }
    }

    saveState(state);

    console.log(JSON.stringify({
      success: true,
      my_username: myUsername,
      count: tweets.length,
      mentions: tweets,
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      code: error.code,
    }));
    process.exit(1);
  }
}

main();
