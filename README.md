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

POST /submit-work?nonce="0xhexstring"
success payload:
    {
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
