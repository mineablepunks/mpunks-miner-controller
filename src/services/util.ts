import { solidityKeccak256 } from "ethers/lib/utils";
import { Web3Provider } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";
import Web3HttpProvider from "web3-providers-http";
import { ethers } from "ethers";

export function mpunksSolidityKeccak256(
  lastMinedAssets: BigNumber,
  addressBits: BigNumber,
  nonce: BigNumber
): BigNumber {
  const h = solidityKeccak256(
    ["uint96", "uint72", "uint88"],
    [lastMinedAssets, addressBits, nonce]
  );

  return BigNumber.from(h);
}

export function getLast72AddressBits(addr: string): BigNumber {
  const addressBits = BigNumber.from(
    "0x" + addr.substring(addr.length - 18, addr.length)
  );

  return addressBits;
}

export const getProvider = (): Web3Provider => {
  const WEB3_HOST = process.env.WEB3_HOST;

  /* @ts-ignore */
  const httpProvider = new Web3HttpProvider(WEB3_HOST);
  const provider = new Web3Provider(httpProvider);
  return provider;
};

export enum GAS_STATUS {
  GAS_TOO_HIGH = "GAS_TOO_HIGH",
  GAS_VALID = "GAS_VALID",
}

export const checkIfGasTooHigh = async ({
  provider,
  maxGasGwei,
}: {
  provider: Web3Provider;
  maxGasGwei: string;
}): Promise<GAS_STATUS> => {
  const maxGasPriceWei = ethers.utils.parseUnits(maxGasGwei, "gwei");

  const currentGasPrice = await provider.getGasPrice();

  return currentGasPrice.gt(maxGasPriceWei)
    ? GAS_STATUS.GAS_TOO_HIGH
    : GAS_STATUS.GAS_VALID;
};

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
