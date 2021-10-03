import { Web3Provider } from "@ethersproject/providers";
import { Otherpunks, Otherpunks__factory } from "../contracts/otherpunks";
import Web3HttpProvider from "web3-providers-http";
import {
  Mineablepunks,
  Mineablepunks__factory,
} from "../contracts/mineablepunks";
import { PublicCryptopunksData } from "../contracts/public-cryptopunks-data";
import { PublicCryptopunksData__factory } from "../contracts/public-cryptopunks-data";
import { getProvider } from "./util";

export const getMineablePunks = (): Mineablepunks => {
  const provider = getProvider();

  const address = process.env.MINEABLE_PUNKS_ADDR;
  const contract = Mineablepunks__factory.connect(address, provider);
  return contract;
};

export const getPublicCryptopunksData = (): PublicCryptopunksData => {
  const provider = getProvider();

  const address = process.env.PUBLIC_CRYPTOPUNKS_DATA_ADDR;
  const contract = PublicCryptopunksData__factory.connect(address, provider);
  return contract;
};

export const getOtherPunks = (): Otherpunks => {
  const provider = getProvider();

  const address = process.env.OTHERPUNKS_ADDR;
  const contract = Otherpunks__factory.connect(address, provider);
  return contract;
};
