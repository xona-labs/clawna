#!/usr/bin/env node
/**
 * Post or reply on X (Twitter) using OAuth 1.0a
 *
 * Usage:
 *   node x-post.mjs "Tweet text here"
 *   node x-post.mjs --reply-to <tweet_id> "Reply text here"
 *
 * Env vars required:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 */

import { TwitterApi } from 'twitter-api-v2';

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

async function main() {
  const args = process.argv.slice(2);
  let replyTo = null;
  let text = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--reply-to' && args[i + 1]) {
      replyTo = args[++i];
    } else if (!text) {
      text = args[i];
    }
  }

  if (!text) {
    console.error(JSON.stringify({
      success: false,
      error: 'Usage: node x-post.mjs [--reply-to <tweet_id>] "text"'
    }));
    process.exit(1);
  }

  if (text.length > 280) {
    console.error(JSON.stringify({
      success: false,
      error: `Tweet too long (${text.length}/280 chars). Shorten your text.`
    }));
    process.exit(1);
  }

  const client = getClient();

  try {
    const params = { text };
    if (replyTo) {
      params.reply = { in_reply_to_tweet_id: replyTo };
    }

    const result = await client.v2.tweet(params);
    const tweetId = result.data.id;
    const url = `https://x.com/i/status/${tweetId}`;

    console.log(JSON.stringify({
      success: true,
      tweet_id: tweetId,
      url,
      is_reply: !!replyTo,
      text
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      code: error.code
    }));
    process.exit(1);
  }
}

main();
