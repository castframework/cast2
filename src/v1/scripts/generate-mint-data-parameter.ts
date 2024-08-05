import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';
import { GetMintDataConfig } from './configuration/mint-data-config';
import { SatelliteDetails, TokenMetadata, TokenOperators } from '../types/types';
import { MINT_DATA_TYPES } from '../test/utils/constants';

async function main() {
  console.log('Starting...');

  const config = await GetMintDataConfig();

  console.log('Used config', config);

  const outputFile = path.join(config.outputFolder, 'mint-data-field.json');

  const newMintData = generateDataForMint(
    config.tokenOperators,
    config.tokenMetadata,
    config.satelliteDetails,
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
  tokenOperators: TokenOperators,
  tokenMetadata: TokenMetadata,
  satelliteDetails: SatelliteDetails,
) {
  var AbiCoder = new ethers.AbiCoder();

  return AbiCoder.encode(
    MINT_DATA_TYPES
    ,
    [tokenOperators, tokenMetadata, satelliteDetails],
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
