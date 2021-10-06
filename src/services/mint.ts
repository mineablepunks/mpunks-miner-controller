import { BigNumber } from "@ethersproject/bignumber";
import { ContractTransaction } from "@ethersproject/contracts";
import { Wallet } from "@ethersproject/wallet";
import { ethers } from "ethers";
import { getMineablePunks } from "./contracts";
import { checkIfGasTooHigh, getProvider } from "./util";

export const mint = async ({
  nonce,
  wallet,
}: {
  nonce: BigNumber;
  wallet: Wallet;
}): Promise<ContractTransaction> => {
  const mineablePunks = getMineablePunks();
  const numMined = await mineablePunks.numMined();

  const provider = getProvider()
  const gasTooHigh = await checkIfGasTooHigh({ provider, maxGasGwei: process.env.MAX_GAS_PRICE_GWEI })

  if (gasTooHigh) {
    throw new Error(`Current gas price is higher than configured MAX_GAS_PRICE_GWEI of ${process.env.MAX_GAS_PRICE_GWEI}`)
  }

  const tx = await mineablePunks.connect(wallet).mint(nonce, 0, {
    gasLimit: (numMined + 1) % 33 === 0 ? 1400000 : 700000,
  });

  console.log(`Submitted mint tx: ${tx.hash}`);

  return tx;
};
