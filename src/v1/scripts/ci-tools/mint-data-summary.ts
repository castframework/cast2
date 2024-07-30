import path from 'path';
import process from 'process';
import {
  GetMintDataConfig,
  MintDataConfig,
} from '../configuration/mint-data-config';

const config = GetMintDataConfig();

const stepOutput = require(path.join(
  process.cwd(),
  config.OutputFolder,
  'mint-data-field.json',
));

const usedConfig: MintDataConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Mint data parameter

### Used configuration 

    - Registrar Agent : ${usedConfig.RegistrarAgentAddress}
    - Settler Agent : ${usedConfig.SettlerAgentAddress}
    - Metadata Uri : ${usedConfig.MetadataUri}
    - Satellite Implementation Address : ${usedConfig.SatelliteImplementationAddress}

### Generated Data Parameter

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
