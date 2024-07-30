import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { GetNewSatelliteImplementationConfig } from './configuration/new-satellite-implementation-config';

async function main() {
  console.log('Starting...');

  const config = GetNewSatelliteImplementationConfig();

  console.log('Used config', config);

  const outputFile = path.join(
    config.OutputFolder,
    'implementation-deploy-satellite-data-field.json',
  );

  const newImplementationDeployData =
    await generateNewImplementationDeployTransaction(
      config.Contracts.ImplementationArtifactName,
    );

  console.log(`Generated data field :\n${newImplementationDeployData}`);

  console.log(`Writing to file : ${outputFile}`);

  const fileContentAsPOJO = {
    description:
      'Data field to be used in a transaction for the deployment of a new implementation contract of a satellite',
    usedConfig: {
      ...config,
    },
    data: newImplementationDeployData,
  };

  await fs.promises.writeFile(
    outputFile,
    JSON.stringify(fileContentAsPOJO, null, '   '),
  );
}

async function generateNewImplementationDeployTransaction(
  implementationContractName: string,
): Promise<string> {
  const satelliteFactory = await ethers.getContractFactory(
    implementationContractName,
  );

  const transactionData = await satelliteFactory.getDeployTransaction();

  return transactionData.data?.toString() || '';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
