import { BigNumber } from "@ethersproject/bignumber";
import { Wallet } from "@ethersproject/wallet";
import { ethers } from "ethers";
import express, { Request, response } from "express";
import path from "path";
import { exit } from "process";
import { checkNonce } from "./services/check-nonce";
import { getMiningInputs } from "./services/get-mining-inputs";
import { mint } from "./services/mint";
import { getProvider } from "./services/util";

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

app.get(
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

      const isFullyValid = await checkNonce({
        nonce,
        senderAddr: wallet.address,
      });

      if (!isFullyValid) {
        throw new Error("Nonce is not valid. Check server logs for info.");
      }

      const tx = await mint({ nonce, wallet });

      res.send(success({ txHash: tx.hash }));
    } catch (e) {
      res.send(err(e));
      console.log("Error submitting work: ", e);
      next();
    }
  }
);

app.get("/mining-inputs", async (req, res, next) => {
  try {
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

    const miningInputs = await getMiningInputs({ senderAddress });
    res.send(success(miningInputs));
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
      console.log("Error getting mining inputs: ", e.message);
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
  "ACCEPT_LICENSE",
  "READ_NOTICE",
];

const LICENSE_ENV_VARIABLES = ["ACCEPT_LICENSE", "READ_NOTICE"];

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
          `Must read the LICENSE and NOTICE files, and IF YOU ACCEPT, set ${LICENSE_ENV_VARIABLES} to "true" in .env.local`
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
    exit(1);
  }
});
