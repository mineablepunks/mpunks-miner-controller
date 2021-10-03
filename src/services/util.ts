import { solidityKeccak256 } from "ethers/lib/utils";
import { Web3Provider } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";
import Web3HttpProvider from "web3-providers-http";

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
