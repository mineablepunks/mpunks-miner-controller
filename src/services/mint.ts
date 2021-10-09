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

  const tx = await mineablePunks.connect(wallet).mint(nonce, 0, {
    gasLimit: (numMined + 1) % 33 === 0 ? 1400000 : 700000,
  });

  console.log(`Submitted mint tx: ${tx.hash}`);

  return tx;
};
