import { Web3Provider } from "@ethersproject/providers";
import Web3HttpProvider from "web3-providers-http";
import { expect } from "chai"
import { checkIfGasTooHigh } from "../src/services/util"

const getTestProvider = (): Web3Provider => {
    const WEB3_HOST = process.env.WEB3_HOST;
  
    /* @ts-ignore */
    const httpProvider = new Web3HttpProvider("https://cloudflare-eth.com");
    const provider = new Web3Provider(httpProvider);
    return provider;
};

describe("MaxGasPriceTest", () => {
    it("should report that gas is too high", async () => {
        const provider = getTestProvider()
        const gasTooHigh = await checkIfGasTooHigh({ 
            provider,
            maxGasGwei: "10"
        })

        expect(gasTooHigh).to.be.true
    })

    it("should report that gas is NOT too high", async () => {
        const provider = getTestProvider()
        const gasTooHigh = await checkIfGasTooHigh({ 
            provider,
            maxGasGwei: "9999"
        })

        expect(gasTooHigh).to.be.false
    })
})