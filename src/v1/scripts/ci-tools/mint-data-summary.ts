import path from 'path';
import process from 'process';
import {
  GetMintDataConfig,
  MintDataConfig,
} from '../configuration/mint-data-config';

const config = GetMintDataConfig();

const stepOutput = require(path.join(
  process.cwd(),
  config.outputFolder,
  'mint-data-field.json',
));

const usedConfig: MintDataConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Mint data parameter

### Used configuration 

    - Registrar Agent : ${usedConfig.tokenOperators.registrarAgent}
    - Settler Agent : ${usedConfig.tokenOperators.settlementAgent}
    - Metadata Uri : ${usedConfig.tokenMetadata.uri}
    - Metadata web Uri : ${usedConfig.tokenMetadata.webUri}
    - former smart contract address : ${usedConfig.tokenMetadata.formerSmartContractAddress}
    - Satellite Implementation Address : ${usedConfig.satelliteDetails.implementationAddress}
    - Satellite name : ${usedConfig.satelliteDetails.name}
    - Satellite symbol : ${usedConfig.satelliteDetails.symbol}

### Generated Data Parameter

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
