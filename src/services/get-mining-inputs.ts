import { getMineablePunks } from "./contracts";
import { getLast72AddressBits } from "./util";

export type MiningInputs = {
  lastMinedAssets: string;
  senderAddressBits: string;
  senderAddress: string;
  difficultyTarget: string;
};

export const getMiningInputs = async ({
  senderAddress,
}: {
  senderAddress: string;
}): Promise<MiningInputs> => {
  const mineablePunks = getMineablePunks();
  const lastMinedAssets = (await mineablePunks.lastMinedPunkAssets())._hex;
  const difficultyTarget = (await mineablePunks.difficultyTarget())._hex;
  const senderAddressBits = getLast72AddressBits(senderAddress)._hex;

  return {
    lastMinedAssets,
    senderAddressBits,
    senderAddress,
    difficultyTarget,
  };
};
