import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";
import { ethers } from "ethers";
import axios from "axios";
import express, { Request } from "express";
import path from "path";
import { checkNonce, NONCE_STATUS } from "./services/check-nonce";
import { getMiningInputs } from "./services/get-mining-inputs";
import { mint } from "./services/mint";
import {
  checkIfGasTooHigh,
  GAS_STATUS,
  getProvider,
  sleep,
} from "./services/util";
import memoize from "memoizee"

require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_PORT = "17394";
const app = express();
const port = process.env.PORT;
if (port !== DEFAULT_PORT) {
  console.warn(`PORT has been changed from the default of ${DEFAULT_PORT}.`);
}

type SubmitWorkQuery = {
  nonce?: string;
};

type PooledMinerResult = {
  address: string;
  error: string;
  success: boolean;
  nonce: string;
  ts: string;
};

const STATUS = {
  success: "success",
  error: "error",
};

function success(payload: any) {
  return {
    status: STATUS.success,
    payload,
  };
}

function err(payload: any) {
  return {
    status: STATUS.error,
    payload,
  };
}

function getSenderAddress(): string {
  let senderAddress;
  if (process.env.PRIVATE_KEY) {
    const wallet = new Wallet(process.env.PRIVATE_KEY);
    senderAddress = wallet.address;
  } else if (
    process.env.ONLY_NEEDED_IF_NOT_INCLUDING_PRIVATE_KEY_WALLET_ADDRESS
  ) {
    senderAddress =
      process.env.ONLY_NEEDED_IF_NOT_INCLUDING_PRIVATE_KEY_WALLET_ADDRESS;
  } else {
    throw new Error(
      "PRIVATE_KEY or ONLY_NEEDED_IF_NOT_INCLUDING_PRIVATE_KEY_WALLET_ADDRESS must be set to use this endpoint."
    );
  }

  return senderAddress;
}

app.get(
  "/check-nonce",
  async (req: Request<any, any, any, SubmitWorkQuery>, res, next) => {
    try {
      if (!req.query.nonce) {
        throw new Error("Missing nonce query parameter.");
      }

      const nonce = BigNumber.from(req.query.nonce);
      const senderAddr = getSenderAddress();

      const nonceStatus = await checkNonce({
        nonce,
        senderAddr,
      });

      console.log(`Nonce ${nonce._hex} has status ${nonceStatus}`);
      res.send(success({ nonceStatus }));
    } catch (e) {
      res.send(err(e));
      console.log("Error checking nonce: ", e);
      next();
    }
  }
);

app.post(
  "/submit-work",
  async (req: Request<any, any, any, SubmitWorkQuery>, res, next) => {
    try {
      if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY must be set to use this endpoint.");
      }

      if (!req.query.nonce) {
        throw new Error("Missing nonce query parameter.");
      }

      const nonce = BigNumber.from(req.query.nonce);
      const provider = getProvider();
      const wallet = new Wallet(process.env.PRIVATE_KEY, provider);

      const nonceStatus = await checkNonce({
        nonce,
        senderAddr: wallet.address,
      });

      if (nonceStatus == NONCE_STATUS.VALID) {
        const provider = getProvider();
        const gasStatus = await checkIfGasTooHigh({
          provider,
          maxGasGwei: process.env.MAX_GAS_PRICE_GWEI,
        });

        if (gasStatus == GAS_STATUS.GAS_TOO_HIGH) {
          console.log(
            `Nonce is valid, but gas price is higher than configured MAX_GAS_PRICE_GWEI of ${process.env.MAX_GAS_PRICE_GWEI}`
          );
          res.send(err({ nonceStatus, gasStatus }));
        } else {
          console.log(`Nonce ${nonce._hex} has status ${nonceStatus}`);
          const tx = await mint({ nonce, wallet });
          console.log(`Nonce submission transaction hash: ${tx.hash}`);
          res.send(success({ nonceStatus, gasStatus, txHash: tx.hash }));
        }
      } else {
        console.log(
          `Nonce ${nonce._hex} has status ${nonceStatus}, and will not be submitted.`
        );
        res.send(err({ nonceStatus }));
      }
    } catch (e) {
      res.send(err(e));
      console.log("Error submitting work: ", e);
      next();
    }
  }
);

const memoizedGetMiningInputs = memoize(getMiningInputs, { maxAge: 30000 })

app.get("/mining-inputs", async (req, res, next) => {
  try {
    const senderAddress = getSenderAddress();
    const miningInputs = await memoizedGetMiningInputs({ senderAddress });
    res.send(success(miningInputs));
    console.log("Successfully sent mining inputs")
  } catch (e) {
    res.send(err(e));
    console.log("Error getting mining inputs: ", e.message);
    next();
  }
});

type HeartbeatQuery = {
  hashrate?: number;
};

app.get(
  "/heartbeat",
  async (req: Request<any, any, any, HeartbeatQuery>, res, next) => {
    try {
      const heartbeat = {
        type: "heartbeat",
        hashrate: req.query.hashrate || "<empty>",
      };
      console.log(heartbeat);
      res.send(success({}));
    } catch (e) {
      res.send(err(e));
      console.log("Error processing heartbeat: ", e.message);
      next();
    }
  }
);

const REQUIRED_ENV_VARIABLES = [
  "WEB3_HOST",
  "PORT",
  "MINEABLE_PUNKS_ADDR",
  "PUBLIC_CRYPTOPUNKS_DATA_ADDR",
  "OTHERPUNKS_ADDR",
  "MAX_GAS_PRICE_GWEI",
  "ACCEPT_MAX_GAS_PRICE_GWEI_VALUE",
  "ACCEPT_LICENSE",
  "READ_NOTICE",
];

const LICENSE_ENV_VARIABLES = [
  "ACCEPT_LICENSE",
  "READ_NOTICE",
  "ACCEPT_MAX_GAS_PRICE_GWEI_VALUE",
];

async function pollPooledMinerResults() {
  const provider = getProvider();
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const submittedNonces = [];
  while (true) {
    let result = await axios.get<PooledMinerResult>(process.env.POOLED_MINER_RESULT_URL);
    let last = result.data;
    console.log(`polling pooled miner results for address ${wallet.address}, last mined address is ${last.address}...`)
    if (last.address === wallet.address &&
      last.error === null &&
      last.success === true &&
      submittedNonces.indexOf(last.nonce) == -1) {
      console.log('found a valid nonce, will mint it if gas price is low enough');
      const nonce = BigNumber.from(last.nonce);

      const gasStatus = await checkIfGasTooHigh({
        provider,
        maxGasGwei: process.env.MAX_GAS_PRICE_GWEI,
      });

      if (gasStatus == GAS_STATUS.GAS_TOO_HIGH) {
        console.log(
          `Gas price is higher than configured MAX_GAS_PRICE_GWEI of ${process.env.MAX_GAS_PRICE_GWEI}, waiting to submit...`
        );
      } else {
        submittedNonces.push(last.nonce);        
        console.log('will send transaction to mint a new mpunk!')
        const tx = await mint({ nonce, wallet });
        console.log(`Nonce submission transaction hash: ${tx.hash}`);
      }

    }
    await sleep(5000);
  }
}

if (process.env.POLL_POOLED_MINER_RESULTS == 'true') {
  pollPooledMinerResults();
}

app.listen(port, async () => {
  try {
    console.log("Initializing...");
    for (let envVariable of REQUIRED_ENV_VARIABLES) {
      if (
        process.env[envVariable] === undefined ||
        process.env[envVariable] === null ||
        process.env[envVariable].length === 0
      ) {
        throw new Error(
          `Required environment variable ${envVariable} is missing from .env.local`
        );
      }
    }

    for (let envVariable of LICENSE_ENV_VARIABLES) {
      if (process.env[envVariable] !== "true") {
        throw new Error(
          `Must read the LICENSE and NOTICE files, as well as inspect the default MAX_GAS_PRICE_GWEI, and IF YOU ACCEPT, set ${LICENSE_ENV_VARIABLES} to "true" in .env.local`
        );
      }
    }

    if (process.env.PRIVATE_KEY) {
      console.log("Attempting to fetch wallet balance as a test...");
      const provider = getProvider();
      const wallet = new Wallet(process.env.PRIVATE_KEY);
      const weiBalance = await provider.getBalance(wallet.address);
      const etherBalance = ethers.utils.formatEther(weiBalance);
      console.log(`Balance: ${etherBalance} ETH`);
    }

    console.log(`Server started.`);
  } catch (e) {
    console.error(`Failed to start server: ${e}`);
    console.log(
      "Keeping the console up so that you can see the error. Close out of the application whenever..."
    );

    while (true) {
      await sleep(300);
    }
  }
});
