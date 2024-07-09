import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { GetMintDataConfig } from './configuration/mint-data-config';

async function main() {
  console.log('Starting...');

  const config = await GetMintDataConfig();

  console.log('Used config', config);

  const outputFile = path.join(config.OutputFolder, 'mint-data-field.json');

  const newMintData = generateDataForMint(
    config.RegistrarAgentAddress,
    config.SettlerAgentAddress,
    config.MetadataUri,
  );

  console.log(`Generated data field :\n${newMintData}`);

  console.log(`Writing to file : ${outputFile}`);

  const fileContentAsPOJO = {
    description:
      'Data field to be used in a transaction for the minting of a new token',
    usedConfig: {
      ...config,
    },
    data: newMintData,
  };

  await fs.promises.writeFile(
    outputFile,
    JSON.stringify(fileContentAsPOJO, null, '   '),
  );
}

function generateDataForMint(
  registrarAgent: string,
  settlementAgent: string,
  metadataUri: string,
) {
  var AbiCoder = new ethers.AbiCoder();

  return AbiCoder.encode(
    [
      'tuple(address registrarAgent, address settlementAgent, string metadataUri) mintData',
    ],
    [{ registrarAgent, settlementAgent, metadataUri }],
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
