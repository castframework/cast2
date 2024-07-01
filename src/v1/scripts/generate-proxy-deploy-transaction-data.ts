import { ethers } from 'hardhat';
import fs from "fs";
import path from "path";
import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import { GetNewSecurityTokenProxyConfig } from './configuration/new-security-token-proxy-config';

async function main() {
    console.log("Starting...");

    const config = GetNewSecurityTokenProxyConfig();

    console.log("Used config", config);

    const outputFile = path.join(config.OutputFolder, "proxy-deploy-data-field.json");

    const implInitializerCall = await buildInitializerCall(config.Contracts.ImplementationArtifactName, config.Contracts.BaseUri);

    console.log(`Encoded initializer call : ${implInitializerCall}`);
    
    const newProxyDeployData = await generateNewImplementationDeployTransaction(config.Contracts.ImplementationAddress, implInitializerCall);

    console.log(`Generated proxy deploy data field :\n${newProxyDeployData}`);

    console.log(`Writing to file : ${outputFile}`);

    const fileContentAsPOJO = {
        description: "Data field to be used in a transaction for the deployment of a new smartcoin Proxy",
        usedConfig:
        {
            ...config
        },
        data: newProxyDeployData
    }

    await fs.promises.writeFile(outputFile, JSON.stringify(fileContentAsPOJO, null, "   "));
}

async function generateNewImplementationDeployTransaction(
    newImplementationAddress: string,
    initializerDataCall: string
): Promise<string> {
    const proxyFactory = await ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode); // UUPS proxy

    const transactionData = await proxyFactory.getDeployTransaction(newImplementationAddress, initializerDataCall);

    return transactionData.data?.toString() || "";
}

async function buildInitializerCall(
    implementationArtifactName: string,
    baseUri: string
): Promise<string>{
    const factorySmartCoin =  await ethers.getContractFactory(implementationArtifactName);

    const securityTokenInterface = factorySmartCoin.interface;

    const initializeFunction = securityTokenInterface.getFunction('initialize');

    return securityTokenInterface.encodeFunctionData(initializeFunction, [baseUri]);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });