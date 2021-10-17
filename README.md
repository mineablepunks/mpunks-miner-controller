# mpunks Miner Controller

The mining controller is a simple HTTP server that returns the data needed to mine `mpunks` (through `/mining-inputs`), and allows the miner to submit valid nonces for minting via `/submit-work?nonce="0xhexstring"`.

This server will act as the blockchain-interfacing component of the official `mpunks` GPU miner, and could act as the blockchain-interfacing component for any `mpunks` mining software.

## Spec

```
ANY ENDPOINT RETURNS:
{
    "status": "success" || "error",
    "payload": { ... }
}

GET /mining-inputs
success payload:
    {
        "lastMinedAssets": "0xhexstring",
        "senderAddressBits": "0xhexstring",
        "difficultyTarget": "0xhexstring"
    }

GET /check-nonce?nonce="0xhexstring"
success payload:
    {
        "nonceStatus": "..."
    }

POST /submit-work?nonce="0xhexstring"
success payload:
    {
        "nonceStatus": "...",
        "gasStatus": "...",
        "txHash": "0x....."
    }

POST /heartbeat?hashrate=1234567
success payload:
    {}
```

## Usage

#### Setup

Install and use Node 14

```
nvm install 14
nvm use 14
```

Create `.env.local` from `.env`

```
cp .env .env.local
```

Read LICENSE and NOTICE, then fill in environment variables within `.env.local`.

#### Run

Only tested with Node 14.

Quickstart

```
nvm install 14
nvm use 14
yarn install
yarn start
```

#### Run to watch a pooled miner result

Just set `POLL_POOLED_MINER_RESULTS` with the value `true` and `POOLED_MINER_RESULT_URL` with an URL which returns a valid JSON structure: 

```
{
  "address": "0x0000",
  "error": null,
  "success": true,
  "nonce": "0x0000",
  "ts": "Thu Oct 14 2021 11:58:36 PM"
}
```

If this URL returns a valid nonce with the same address than the one you provided a private key for, and if the gas is low enough, a mint transaction will be executed to mint an mpunk with the found nonce.
