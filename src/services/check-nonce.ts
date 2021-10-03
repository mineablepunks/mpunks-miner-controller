import { BigNumber } from "@ethersproject/bignumber";
import {
  getMineablePunks,
  getOtherPunks,
  getPublicCryptopunksData,
} from "./contracts";
import { getLast72AddressBits, mpunksSolidityKeccak256 } from "./util";
import { assetsToPunkId } from "../assets/assets";

export const checkNonce = async ({
  nonce,
  senderAddr,
}: {
  nonce: BigNumber;
  senderAddr: string;
}): Promise<boolean> => {
  const mineablePunks = getMineablePunks();
  const passesDifficultyTest = await mineablePunks
    .connect(senderAddr)
    .isValidNonce(nonce);

  if (!passesDifficultyTest) {
    console.error(`Nonce ${nonce._hex} does not pass difficulty test`);
    return false;
  }

  const lastMinedAssets = await mineablePunks.lastMinedPunkAssets();
  const senderAddrBits = getLast72AddressBits(senderAddr);
  const seed = mpunksSolidityKeccak256(lastMinedAssets, senderAddrBits, nonce);
  const otherPunks = getOtherPunks();
  const packedAssets = await otherPunks.seedToPunkAssets(seed);

  const existingPunkId = await mineablePunks.punkAssetsToId(packedAssets);
  if (existingPunkId.gt(BigNumber.from(0))) {
    console.error(
      `Nonce ${nonce._hex} produces existing mpunk #${existingPunkId}`
    );
    return false;
  }

  const publicCryptopunksData = getPublicCryptopunksData();
  const assetNames = await publicCryptopunksData.getPackedAssetNames(
    packedAssets
  );

  const ogCryptopunkId = assetsToPunkId[assetNames];
  if (ogCryptopunkId) {
    console.error(
      `Nonce ${nonce._hex} produces OG CryptoPunk #${ogCryptopunkId}`
    );
    return false;
  }

  return true;
};
