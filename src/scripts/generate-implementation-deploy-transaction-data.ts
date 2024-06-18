import { ethers } from 'hardhat';
import fs from "fs";
import path from "path";
import config from "../../new-security-token-implementation-config.json";

async function main() {
    console.log("Starting...");

    const outputFile = path.join(config.OuputFolder, "implementation-deploy-data-field.json");

    const newImplementationDeployData = await generateNewImplementationDeployTransaction( 
        {
            RegistrarAddress: config.NewOperatorsAddress.Registrar,
            TechnicalAddress: config.NewOperatorsAddress.Technical
        },
        config.Contracts.ImplementationArtifactName
    );

    console.log(`Generated data field :\n${newImplementationDeployData}`);

    console.log(`Writing to file : ${outputFile}`);

    const fileContentAsPOJO = {
        description: "Data field to be used in a transaction for the deployment of a new implementation contract of a security token",
        usedConfig:
        {
            ...config
        },
        data: newImplementationDeployData
    }

    await fs.promises.writeFile(outputFile, JSON.stringify(fileContentAsPOJO, null, "   "));
}

async function generateNewImplementationDeployTransaction(
    operatorAddress: {RegistrarAddress: string, TechnicalAddress: string },
    implementationContractName: string
): Promise<string> {

    const securityTokenFactory =  await ethers.getContractFactory(implementationContractName);

    const transactionData = await securityTokenFactory
    .getDeployTransaction(
        operatorAddress.RegistrarAddress,
        operatorAddress.TechnicalAddress
    );

    return transactionData.data?.toString() || "";
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });