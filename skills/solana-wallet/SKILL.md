---
name: solana-wallet
description: Manage the Solana wallet for x402 payments. Create wallet JSON file from the AGENT_WALLET_SECRET env var, check wallet balance, get public key, and verify wallet setup. Use when the owner asks to set up the wallet, check balance, or troubleshoot wallet issues.
---

# Solana Wallet Management

This skill manages the Solana wallet used for x402 micropayments.

## Wallet Location

The Solana CLI expects the wallet at: `~/.config/solana/id.json`

Inside the container: `/home/node/.config/solana/id.json`

## Create Wallet JSON from Environment

The `AGENT_WALLET_SECRET` env var contains the base58-encoded private key. Run this to create the JSON file:

```bash
mkdir -p ~/.config/solana && node -e '
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58decode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let carry = ALPHABET.indexOf(str[i]);
    if (carry < 0) throw new Error("Invalid base58 character");
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.push(0);
  return bytes.reverse();
}
const secret = process.env.AGENT_WALLET_SECRET;
if (!secret) { console.error("AGENT_WALLET_SECRET not set"); process.exit(1); }
const bytes = bs58decode(secret);
console.log(JSON.stringify(bytes));
' > ~/.config/solana/id.json && echo "Wallet created at ~/.config/solana/id.json"
```

## Verify Wallet Exists

```bash
ls -la ~/.config/solana/id.json 2>/dev/null && echo "Wallet file exists" || echo "Wallet file NOT found"
```

## Get Public Key

Extract the public key (last 32 bytes) and encode as base58:

```bash
node -e '
const fs = require("fs");
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bs58encode(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) str += "1";
  for (let i = digits.length - 1; i >= 0; i--) str += ALPHABET[digits[i]];
  return str;
}
try {
  const keypair = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json"));
  const pubkey = keypair.slice(32);
  console.log("Public Key:", bs58encode(pubkey));
} catch(e) {
  console.error("Error:", e.message);
}
'
```

## Check SOL Balance

```bash
curl -s -X POST https://solana-mainnet.g.alchemy.com/v2/Ug5mqBVIbSHoa8ZHgTUSJ -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getBalance",
  "params": ["<PUBLIC_KEY>"]
}' | node -e '
const data = require("fs").readFileSync(0, "utf8");
const res = JSON.parse(data);
if (res.result) {
  const sol = res.result.value / 1e9;
  console.log("SOL Balance:", sol.toFixed(4), "SOL");
} else {
  console.error("Error:", res.error?.message || "Unknown error");
}
'
```

Replace `<PUBLIC_KEY>` with the actual public key from the previous command.

## Check USDC Balance

USDC token mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

```bash
curl -s -X POST https://solana-mainnet.g.alchemy.com/v2/Ug5mqBVIbSHoa8ZHgTUSJ -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTokenAccountsByOwner",
  "params": [
    "<PUBLIC_KEY>",
    {"mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"},
    {"encoding": "jsonParsed"}
  ]
}' | node -e '
const data = require("fs").readFileSync(0, "utf8");
const res = JSON.parse(data);
if (res.result?.value?.length > 0) {
  const info = res.result.value[0].account.data.parsed.info;
  const amount = info.tokenAmount.uiAmount;
  console.log("USDC Balance:", amount.toFixed(2), "USDC");
} else {
  console.log("USDC Balance: 0.00 USDC (no token account found)");
}
'
```

## Full Wallet Setup Workflow

When the owner asks to set up or verify the wallet:

1. **Create the wallet JSON** (run the create command above)
2. **Verify the file exists** (run the verify command)
3. **Get the public key** (run the pubkey command)
4. **Check balances** (run SOL and USDC balance checks)
5. **Report status** to the owner

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "AGENT_WALLET_SECRET not set" | The env var is missing from `.env` or not loaded |
| "Wallet file NOT found" | Run the create command first |
| "Invalid base58 character" | The secret key is corrupted or incorrectly formatted |
| Zero balances | Fund the wallet with SOL (for fees) and USDC (for x402 payments) |

## Security Notes

- The `id.json` file contains your private key — never share or expose it
- The public key is safe to share (it's your wallet address)
- Keep `AGENT_WALLET_SECRET` secure in your `.env` file
