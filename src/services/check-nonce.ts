import { BigNumber } from "@ethersproject/bignumber";
import {
  getMineablePunks,
  getOtherPunks,
  getPublicCryptopunksData,
} from "./contracts";
import { getLast72AddressBits, mpunksSolidityKeccak256 } from "./util";
import { assetsToPunkId } from "../assets/assets";
import { solidityKeccak256 } from "ethers/lib/utils";

export enum NONCE_STATUS {
  FAILS_DIFFICULTY_TEST = "FAILS_DIFFICULTY_TEST",
  PRODUCES_EXISTING_MPUNK = "PRODUCES_EXISTING_MPUNK",
  PRODUCES_EXISTING_OG_PUNK = "PRODUCES_EXISTING_OG_PUNK",
  VALID = "VALID",
}

export const checkNonce = async ({
  nonce,
  senderAddr,
}: {
  nonce: BigNumber;
  senderAddr: string;
}): Promise<NONCE_STATUS> => {
  const mineablePunks = getMineablePunks();
  const passesDifficultyTest = await mineablePunks
    .connect(senderAddr)
    .isValidNonce(nonce);

  if (!passesDifficultyTest) {
    return NONCE_STATUS.FAILS_DIFFICULTY_TEST;
  }

  const numMined = await mineablePunks.numMined();
  const lastMinedAssets = await mineablePunks.lastMinedPunkAssets();
  const senderAddrBits = getLast72AddressBits(senderAddr);
  const seed = mpunksSolidityKeccak256(lastMinedAssets, senderAddrBits, nonce);
  const otherPunks = getOtherPunks();
  const packedAssets = await otherPunks.seedToPunkAssets(seed);

  const punkAssets = [packedAssets]
  if ((numMined + 1) % 33 === 0) {
    const founderSeed = solidityKeccak256(["uint256"], [seed])
    const founderAssets = await otherPunks.seedToPunkAssets(founderSeed)
    punkAssets.push(founderAssets)
  }

  for (let assets in punkAssets) {
    let existingPunkId = await mineablePunks.punkAssetsToId(assets);
    if (existingPunkId.gt(BigNumber.from(0))) {
      return NONCE_STATUS.PRODUCES_EXISTING_MPUNK;
    }
  }

  const publicCryptopunksData = getPublicCryptopunksData();
  for (let assets in punkAssets) {
    const assetNames = await publicCryptopunksData.getPackedAssetNames(
      assets
    );

    const ogCryptopunkId = assetsToPunkId[assetNames];
    if (ogCryptopunkId) {
      return NONCE_STATUS.PRODUCES_EXISTING_OG_PUNK;
    }
  }

  return NONCE_STATUS.VALID;
};
